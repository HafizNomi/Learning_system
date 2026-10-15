import uuid

from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from datetime import datetime

from django.core.exceptions import ValidationError
from .models import MonthlyReport
from .serializers import MonthlyReportSerializer
from applications.models import Application
from scheduling.models import ClassSession
from attendance.models import Attendance

class ReportCreateView(APIView):
    """Teacher: Create monthly report for a student"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'teacher' and request.user.role != 'admin':
            return Response({
                'error': 'Only teachers and admins can create reports'
            }, status=status.HTTP_403_FORBIDDEN)
        
        student_id = request.data.get('student_id')
        course_id = request.data.get('course_id')
        month = request.data.get('month', datetime.now().month)
        year = request.data.get('year', datetime.now().year)
        
        try:
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            return Response(
                {'error': 'month and year must be numbers'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= month <= 12:
            return Response(
                {'month': 'Must be between 1 and 12'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        is_admin = request.user.role == 'admin' or request.user.is_staff
        
        # A teacher may only write about a student they actually teach.
        # Without this, student_id and course_id come straight from the request
        # body and any teacher could author a report on any child.
        #
        # Either a class they taught, or the assignment itself - a teacher who
        # has been given a student but whose first classes have not happened
        # yet should still be able to start the month's report.
        if not is_admin:
            try:
                teaches = (
                    ClassSession.objects.filter(
                        teacher=request.user,
                        student_id=student_id,
                        course_id=course_id,
                    ).exists()
                    or Application.objects.filter(
                        assigned_teacher=request.user,
                        student_id=student_id,
                        course_id=course_id,
                    ).exists()
                )
            except (ValueError, ValidationError):
                return Response(
                    {'error': 'Invalid student_id or course_id'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not teaches:
                return Response({
                    'error': 'You do not teach this student on this course.'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if report already exists
        try:
            report, created = MonthlyReport.objects.get_or_create(
                student_id=student_id,
                course_id=course_id,
                month=month,
                year=year,
                defaults={
                    'teacher': request.user,
                    'total_classes': 0,
                    'classes_attended': 0,
                    'attendance_percentage': 0
                }
            )
        except (ValueError, ValidationError):
            return Response(
                {'error': 'Invalid student_id or course_id'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # An existing report belongs to whoever wrote it. `is_finalized` is
        # writable below, so without this another teacher could not only
        # rewrite the report but publish it to the parent.
        if not created and report.teacher_id != request.user.id and not is_admin:
            return Response({
                'error': 'This report was written by another teacher.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update with data from request
        for field in ['topics_covered', 'strengths', 'areas_for_improvement',
                     'teacher_comments', 'recommended_next_level',
                     'surahs_memorized', 'tajweed_improvement',
                     'projects_completed', 'skills_acquired']:
            if field in request.data:
                setattr(report, field, request.data[field])

        # Finalising is what makes the report visible to the parent, so it has
        # to be writable here - without it a report stays a draft forever.
        if 'is_finalized' in request.data:
            report.is_finalized = bool(request.data['is_finalized'])
        
        # Auto-calculate attendance
        sessions = ClassSession.objects.filter(
            student_id=student_id,
            course_id=course_id,
            start_time__month=month,
            start_time__year=year,
            status='completed'
        )
        
        total = sessions.count()
        attendances = Attendance.objects.filter(
            student_id=student_id,
            session__in=sessions,
            is_present=True
        )
        present = attendances.count()
        
        report.total_classes = total
        report.classes_attended = present
        report.attendance_percentage = (present / total * 100) if total > 0 else 0
        
        report.save()
        
        serializer = MonthlyReportSerializer(report)
        return Response(serializer.data)

class ReportListView(generics.ListAPIView):
    """List reports for a student"""
    
    serializer_class = MonthlyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        base = MonthlyReport.objects.select_related('student', 'teacher', 'course')
        
        if user.role == 'admin':
            queryset = base.all()
        elif user.role == 'teacher':
            queryset = base.filter(teacher=user)
        elif user.role == 'student':
            # A parent should only ever see a finalised report - a half-written
            # draft is not something to send home.
            queryset = base.filter(student=user, is_finalized=True)
        else:
            return MonthlyReport.objects.none()
        
        # Filter by student_id if provided
        student_id = self.request.query_params.get('student_id')
        if student_id:
            try:
                queryset = queryset.filter(student_id=uuid.UUID(student_id))
            except (TypeError, ValueError, AttributeError):
                raise DRFValidationError({'student_id': 'Not a valid id.'})
        
        # Unparseable filters are a bad request, not a server error.
        for field in ('month', 'year'):
            raw = self.request.query_params.get(field)
            if not raw:
                continue
            try:
                queryset = queryset.filter(**{field: int(raw)})
            except (TypeError, ValueError):
                raise DRFValidationError({field: 'Must be a number.'})
        
        return queryset.order_by('-year', '-month')

class ReportDetailView(generics.RetrieveAPIView):
    """Get specific report details"""
    
    serializer_class = MonthlyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return MonthlyReport.objects.all()
        elif user.role == 'teacher':
            return MonthlyReport.objects.filter(teacher=user)
        elif user.role == 'student':
            return MonthlyReport.objects.filter(student=user, is_finalized=True)
        
        return MonthlyReport.objects.none()
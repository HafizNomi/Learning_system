from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from datetime import datetime
from .models import Attendance, MonthlyAttendanceSummary
from .serializers import AttendanceSerializer, MonthlyAttendanceSummarySerializer
from scheduling.models import ClassSession

class MarkAttendanceView(APIView):
    """Teacher: Mark attendance for a session"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Check if user is a teacher (admins stand in when a teacher cannot)
        is_admin = request.user.role == 'admin' or request.user.is_staff
        if request.user.role != 'teacher' and not is_admin:
            return Response({
                'error': 'Only teachers can mark attendance'
            }, status=status.HTTP_403_FORBIDDEN)
        
        session_id = request.data.get('session_id')
        session = get_object_or_404(ClassSession, id=session_id)
        
        # Check if teacher is assigned to this session
        if session.teacher != request.user and not is_admin:
            return Response({
                'error': 'You are not assigned to this session'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if attendance already exists
        attendance, created = Attendance.objects.get_or_create(
            session=session,
            defaults={
                'student': session.student,
                'teacher': session.teacher,
                'is_present': request.data.get('is_present', False),
                'is_late': request.data.get('is_late', False),
                'duration_attended': request.data.get('duration_attended', 0),
                'teacher_remarks': request.data.get('teacher_remarks', ''),
                'student_performance': request.data.get('student_performance', 'average')
            }
        )
        
        if not created:
            # Update existing attendance
            for field in ['is_present', 'is_late', 'duration_attended', 
                         'teacher_remarks', 'student_performance']:
                if field in request.data:
                    setattr(attendance, field, request.data[field])
            attendance.save()
        
        # Update session status
        session.status = 'completed'
        session.save()
        
        # Update monthly summary
        self.update_monthly_summary(session.student, session.course)
        
        serializer = AttendanceSerializer(attendance)
        return Response({
            'message': 'Attendance marked successfully',
            'attendance': serializer.data
        })
    
    def update_monthly_summary(self, student, course):
        """Update or create monthly attendance summary"""
        now = timezone.now()
        month = now.month
        year = now.year
        
        # Get all sessions for this student in this month
        sessions = ClassSession.objects.filter(
            student=student,
            course=course,
            start_time__month=month,
            start_time__year=year,
            status='completed'
        )
        
        # Get attendance records
        attendances = Attendance.objects.filter(
            student=student,
            session__in=sessions
        )
        
        total = sessions.count()
        present = attendances.filter(is_present=True).count()
        absent = total - present
        late = attendances.filter(is_late=True).count()
        
        percentage = (present / total * 100) if total > 0 else 0
        
        # Update or create summary
        summary, created = MonthlyAttendanceSummary.objects.update_or_create(
            student=student,
            course=course,
            month=month,
            year=year,
            defaults={
                'total_sessions': total,
                'present_sessions': present,
                'absent_sessions': absent,
                'late_sessions': late,
                'attendance_percentage': round(percentage, 2)
            }
        )

class MonthlyAttendanceSummaryView(generics.ListAPIView):
    """View monthly attendance summary for a student"""
    
    serializer_class = MonthlyAttendanceSummarySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all
            return MonthlyAttendanceSummary.objects.all()
        elif user.role == 'teacher':
            # Teacher can see their students' summaries
            return MonthlyAttendanceSummary.objects.filter(
                student__teacher_sessions__teacher=user
            ).distinct()
        elif user.role == 'student':
            # Student can see their own
            return MonthlyAttendanceSummary.objects.filter(student=user)
        
        return MonthlyAttendanceSummary.objects.none()

class StudentAttendanceView(generics.ListAPIView):
    """Get detailed attendance for a specific student (parent view)"""
    
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        student_id = self.request.query_params.get('student_id')
        
        if self.request.user.role == 'admin':
            return Attendance.objects.filter(student_id=student_id)
        elif self.request.user.role == 'student':
            return Attendance.objects.filter(student=self.request.user)
        elif self.request.user.role == 'teacher':
            return Attendance.objects.filter(
                student_id=student_id,
                teacher=self.request.user
            )
        return Attendance.objects.none()
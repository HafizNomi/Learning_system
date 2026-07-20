from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
from .models import ClassSession
from .serializers import ClassSessionSerializer
from applications.models import Application

class UpcomingSessionsView(generics.ListAPIView):
    """View upcoming classes for the logged-in user"""
    
    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        if user.role == 'teacher':
            return ClassSession.objects.filter(
                teacher=user,
                start_time__gte=now,
                status='scheduled'
            ).order_by('start_time')
        elif user.role == 'student':
            return ClassSession.objects.filter(
                student=user,
                start_time__gte=now,
                status='scheduled'
            ).order_by('start_time')
        elif user.role == 'admin':
            return ClassSession.objects.filter(
                start_time__gte=now
            ).order_by('start_time')
        return ClassSession.objects.none()

class TeacherScheduleView(generics.ListAPIView):
    """View teacher's full schedule for a specific date"""
    
    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Get date from query param, default to today
        date_str = self.request.query_params.get('date')
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date = timezone.now().date()
        
        # Get start and end of the day
        start = datetime.combine(date, datetime.min.time())
        end = datetime.combine(date, datetime.max.time())
        
        if user.role == 'teacher':
            return ClassSession.objects.filter(
                teacher=user,
                start_time__gte=start,
                start_time__lte=end
            ).order_by('start_time')
        return ClassSession.objects.none()

class CreateSessionView(APIView):
    """Admin/Teacher: Create a new class session"""
    
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        data = request.data
        application_id = data.get('application_id')
        
        # Get the application
        application = get_object_or_404(Application, id=application_id)
        
        # Get teacher
        teacher = application.assigned_teacher
        if not teacher:
            return Response({
                'error': 'No teacher assigned to this application'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse date and time
        start_time = data.get('start_time')
        duration = data.get('duration', 45)  # Default 45 minutes
        
        try:
            # Convert to datetime
            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end = start + timedelta(minutes=int(duration))
        except:
            return Response({
                'error': 'Invalid date format. Use ISO format: 2026-07-15T17:00:00Z'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if teacher is available
        overlapping = ClassSession.objects.filter(
            teacher=teacher,
            start_time__lt=end,
            end_time__gt=start,
            status='scheduled'
        ).exists()
        
        if overlapping:
            return Response({
                'error': 'Teacher is already booked at this time'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create session
        session = ClassSession.objects.create(
            student=application.student,
            teacher=teacher,
            course=application.course,
            application=application,
            start_time=start,
            end_time=end,
            status='scheduled'
        )
        
        # TODO: Generate meeting link (Daily.co)
        # session.meeting_link = generate_meeting_link(session.id)
        session.save()
        
        serializer = ClassSessionSerializer(session, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UpdateSessionView(APIView):
    """Update session details (reschedule, cancel)"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, session_id):
        session = get_object_or_404(ClassSession, id=session_id)
        
        # Check permissions
        if request.user.role != 'admin' and request.user != session.teacher:
            return Response({
                'error': 'You don\'t have permission to update this session'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update fields
        if 'status' in request.data:
            session.status = request.data['status']
        
        if 'start_time' in request.data:
            start = datetime.fromisoformat(
                request.data['start_time'].replace('Z', '+00:00')
            )
            session.start_time = start
            session.end_time = start + timedelta(minutes=45)
        
        session.save()
        
        serializer = ClassSessionSerializer(session, context={'request': request})
        return Response(serializer.data)
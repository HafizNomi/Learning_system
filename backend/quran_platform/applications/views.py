from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.shortcuts import get_object_or_404
from accounts.permissions import IsAdmin
from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer


def applications_visible_to(user):
    """
    The applications a user is allowed to read.

    Admins see everything; teachers see what they were assigned; everyone else
    sees the applications tied to their account - either linked on approval or
    matching the email they applied with.
    """
    if user.role == 'admin' or user.is_staff:
        return Application.objects.all()
    if user.role == 'teacher':
        return Application.objects.filter(assigned_teacher=user)
    return Application.objects.filter(Q(student=user) | Q(parent_email__iexact=user.email))


class ApplicationCreateView(generics.CreateAPIView):
    """Students/Parents: Submit a new application"""
    
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Create application and send confirmation email"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # TODO: Send email confirmation to parent
        # Send email: "Your application has been received"
        
        return Response({
            'message': 'Application submitted successfully!',
            'application_id': serializer.data['id'],
            'status': 'pending',
            'application': serializer.data,
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """A signed-in applicant is linked to their application straight away"""
        user = self.request.user
        if user.is_authenticated and user.role == 'student':
            serializer.save(student=user)
        else:
            serializer.save()

class ApplicationDetailView(generics.RetrieveAPIView):
    """View application status"""
    
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Students can only see their own applications"""
        return applications_visible_to(self.request.user)

class MyApplicationListView(generics.ListAPIView):
    """The signed-in user's own applications"""
    
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return applications_visible_to(self.request.user)

class ApplicationListView(generics.ListAPIView):
    """List all applications (admin only)"""
    
    serializer_class = ApplicationSerializer
    permission_classes = [IsAdmin]
    queryset = Application.objects.select_related('course', 'assigned_teacher').all()
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'course', 'assigned_teacher']
    search_fields = ['student_name', 'parent_name', 'parent_email', 'parent_phone']
    ordering_fields = ['created_at', 'updated_at', 'student_name']
    ordering = ['-created_at']

class ApplicationStatusUpdateView(APIView):
    """Admin: Update application status (approve/reject)"""
    
    permission_classes = [IsAdmin]
    
    def patch(self, request, application_id):
        application = get_object_or_404(Application, id=application_id)
        serializer = ApplicationStatusUpdateSerializer(
            application, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # Check if status is being changed
            new_status = request.data.get('status')
            application = serializer.save()
            
            if new_status == 'approved':
                # Assign student to the application
                # Create user account for student if doesn't exist
                self._create_student_user(application)
                
                # TODO: Send approval email with teacher details
                # Send email: "Your application has been approved!"
                
            elif new_status == 'rejected':
                # TODO: Send rejection email
                pass
            
            return Response({
                'message': f'Application {new_status or "updated"} successfully',
                'application': ApplicationSerializer(application).data,
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_student_user(self, application):
        """Create Django user for approved student"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if application.student_id:
            return
        
        # Check if user already exists
        user, created = User.objects.get_or_create(
            email=application.parent_email,
            defaults={
                'username': application.parent_email,
                'first_name': application.student_name,
                'role': 'student',
                'timezone': application.preferred_timezone
            }
        )
        
        if created:
            # Set random password (user will reset via email)
            import secrets
            password = secrets.token_urlsafe(12)
            user.set_password(password)
            user.save()
            
            # TODO: Send login credentials email
        
        # Link student to application
        application.student = user
        application.save(update_fields=['student', 'updated_at'])

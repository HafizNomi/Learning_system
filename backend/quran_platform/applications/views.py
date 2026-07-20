from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer

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
            'status': 'pending'
        }, status=status.HTTP_201_CREATED)

class ApplicationDetailView(generics.RetrieveAPIView):
    """View application status"""
    
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Students can only see their own applications"""
        user = self.request.user
        if user.role == 'student':
            return Application.objects.filter(student=user)
        return Application.objects.all()

class ApplicationListView(generics.ListAPIView):
    """List all applications (admin only)"""
    
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Application.objects.all()
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'course']

class ApplicationStatusUpdateView(APIView):
    """Admin: Update application status (approve/reject)"""
    
    permission_classes = [permissions.IsAdminUser]
    
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
            
            if new_status == 'approved':
                # Assign student to the application
                # Create user account for student if doesn't exist
                self._create_student_user(application)
                
                # TODO: Send approval email with teacher details
                # Send email: "Your application has been approved!"
                
            elif new_status == 'rejected':
                # TODO: Send rejection email
                pass
            
            serializer.save()
            return Response({
                'message': f'Application {new_status} successfully',
                'application': serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_student_user(self, application):
        """Create Django user for approved student"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
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
        application.save()
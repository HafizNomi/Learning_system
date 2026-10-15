from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.shortcuts import get_object_or_404
import logging

from accounts.emails import send_application_received
from accounts.permissions import IsAdmin
from .services import ApprovalError, handle_status_change
from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer

logger = logging.getLogger(__name__)


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
        application = self.perform_create(serializer)
        
        # Best-effort: a dead SMTP server must not fail the application.
        if application is not None:
            try:
                send_application_received(application)
            except Exception:  # noqa: BLE001
                logger.exception('Confirmation email failed for %s', application.id)
        
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
            return serializer.save(student=user)
        return serializer.save()

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
            
            # Creating the login and emailing the parent lives in the service
            # layer, so the Django admin does exactly the same thing.
            try:
                handle_status_change(application, new_status)
            except ApprovalError as exc:
                return Response(
                    {'assigned_teacher': [str(exc)]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            application.refresh_from_db()
            return Response({
                'message': f'Application {new_status or "updated"} successfully',
                'application': ApplicationSerializer(application).data,
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

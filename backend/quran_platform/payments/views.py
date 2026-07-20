from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
import stripe
from django.conf import settings
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer
from applications.models import Application

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentCreateView(APIView):
    """Create a payment intent for Stripe"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Get application
        application_id = request.data.get('application_id')
        application = get_object_or_404(Application, id=application_id)
        
        # Check if user owns this application
        if request.user != application.student and request.user.role != 'admin':
            return Response({
                'error': 'You don\'t have permission for this payment'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get amount
        amount = application.course.price_per_month
        
        # Create Stripe PaymentIntent
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(float(amount) * 100),  # Convert to cents
                currency='usd',
                metadata={
                    'application_id': str(application.id),
                    'student_id': str(request.user.id),
                    'course_id': str(application.course.id)
                },
                receipt_email=request.user.email,
                description=f"Monthly fee for {application.course.title}"
            )
            
            # Create payment record
            payment = Payment.objects.create(
                student=request.user,
                application=application,
                amount=amount,
                payment_month=timezone.now().month,
                payment_year=timezone.now().year,
                stripe_payment_intent_id=intent.id,
                status='pending'
            )
            
            return Response({
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'payment_id': payment.id,
                'amount': str(amount)
            })
            
        except stripe.error.StripeError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class PaymentSuccessView(APIView):
    """Handle successful payment from Stripe webhook"""
    
    def post(self, request):
        # This is the webhook endpoint for Stripe
        # See: https://stripe.com/docs/webhooks
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        
        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            self.handle_successful_payment(payment_intent)
        
        return Response(status=status.HTTP_200_OK)
    
    def handle_successful_payment(self, payment_intent):
        """Update payment status and activate student"""
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=payment_intent['id']
            )
            payment.status = 'paid'
            payment.paid_at = timezone.now()
            payment.save()
            
            # Update application status
            application = payment.application
            application.status = 'active'
            application.save()
            
            # TODO: Create initial class sessions
            # self.create_initial_sessions(application)
            
        except Payment.DoesNotExist:
            print(f"Payment not found: {payment_intent['id']}")

class PaymentHistoryView(generics.ListAPIView):
    """View payment history"""
    
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Payment.objects.all().order_by('-created_at')
        elif user.role == 'student':
            return Payment.objects.filter(student=user).order_by('-created_at')
        elif user.role == 'teacher':
            # Teachers can see payments for their students
            return Payment.objects.filter(
                application__assigned_teacher=user
            ).order_by('-created_at')
        
        return Payment.objects.none()

class PaymentStatusView(APIView):
    """Check payment status for a specific payment"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id)
        
        # Check permission
        if request.user.role != 'admin' and request.user != payment.student:
            return Response({
                'error': 'You don\'t have permission to view this payment'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)
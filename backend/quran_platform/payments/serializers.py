from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    """Convert Payment to JSON"""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'student_name', 'application',
            'amount', 'currency', 'payment_type',
            'payment_month', 'payment_year',
            'stripe_payment_intent_id', 'stripe_customer_id',
            'status', 'status_display', 'payment_method',
            'receipt_url', 'notes', 'created_at', 'paid_at'
        ]
        read_only_fields = ['id', 'student', 'created_at', 'paid_at']

class PaymentCreateSerializer(serializers.ModelSerializer):
    """For creating a new payment"""
    
    class Meta:
        model = Payment
        fields = [
            'application', 'amount', 'payment_month', 'payment_year',
            'payment_type'
        ]
    
    def validate(self, data):
        """Check if student already paid for this month"""
        from django.db.models import Q
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Get the student from application
        application = data.get('application')
        if application:
            student = application.student
            existing = Payment.objects.filter(
                student=student,
                payment_month=data.get('payment_month'),
                payment_year=data.get('payment_year'),
                status='paid'
            ).exists()
            if existing:
                raise serializers.ValidationError(
                    "Payment already made for this month"
                )
        return data
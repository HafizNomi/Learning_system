from django.db import models
from django.contrib.auth import get_user_model
from applications.models import Application
import uuid

User = get_user_model()

class Payment(models.Model):
    """Record of all payments"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_TYPE = [
        ('monthly_fee', 'Monthly Fee'),
        ('registration', 'Registration Fee'),
        ('trial', 'Trial Session'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE, default='monthly_fee')
    
    # Month for which payment is for (e.g., January 2026)
    payment_month = models.IntegerField()  # 1-12
    payment_year = models.IntegerField()
    
    # Stripe integration
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True)  # card, bank_transfer, etc.
    
    # Receipt
    receipt_url = models.URLField(blank=True, null=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.student.email} - ${self.amount} - {self.month}/{self.year} - {self.status}"
from django.contrib import admin
from .models import Payment

class PaymentAdmin(admin.ModelAdmin):
    list_display = ['student', 'amount', 'payment_month', 'payment_year', 'status']
    list_filter = ['status', 'payment_type']

admin.site.register(Payment, PaymentAdmin)
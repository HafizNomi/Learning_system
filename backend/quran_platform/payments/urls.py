from django.urls import path
from .views import (
    PaymentCreateView, PaymentSuccessView,
    PaymentHistoryView, PaymentStatusView
)

urlpatterns = [
    path('create/', PaymentCreateView.as_view(), name='payment-create'),
    path('webhook/', PaymentSuccessView.as_view(), name='payment-webhook'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('<uuid:payment_id>/status/', PaymentStatusView.as_view(), name='payment-status'),
]
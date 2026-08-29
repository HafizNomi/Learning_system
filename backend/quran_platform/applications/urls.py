from django.urls import path
from .views import (
    ApplicationCreateView, ApplicationDetailView, MyApplicationListView,
    ApplicationListView, ApplicationStatusUpdateView
)

urlpatterns = [
    path('', ApplicationListView.as_view(), name='application-list'),
    path('apply/', ApplicationCreateView.as_view(), name='application-apply'),
    path('my/', MyApplicationListView.as_view(), name='application-mine'),
    path('<uuid:id>/', ApplicationDetailView.as_view(), name='application-detail'),
    path('<uuid:application_id>/update-status/', 
         ApplicationStatusUpdateView.as_view(), 
         name='application-update-status'),
]

from django.urls import path
from .views import ReportCreateView, ReportListView, ReportDetailView

urlpatterns = [
    path('create/', ReportCreateView.as_view(), name='report-create'),
    path('', ReportListView.as_view(), name='report-list'),
    path('<uuid:id>/', ReportDetailView.as_view(), name='report-detail'),
]
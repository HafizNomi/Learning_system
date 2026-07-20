from django.urls import path
from .views import (
    MarkAttendanceView, MonthlyAttendanceSummaryView,
    StudentAttendanceView
)

urlpatterns = [
    path('mark/', MarkAttendanceView.as_view(), name='mark-attendance'),
    path('monthly-summary/', MonthlyAttendanceSummaryView.as_view(), name='monthly-summary'),
    path('student-attendance/', StudentAttendanceView.as_view(), name='student-attendance'),
]
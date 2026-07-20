from django.contrib import admin
from .models import Attendance, MonthlyAttendanceSummary

admin.site.register(Attendance)
admin.site.register(MonthlyAttendanceSummary)
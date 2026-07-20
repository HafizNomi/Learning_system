from django.contrib import admin
from .models import Application

class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'course', 'status', 'created_at']
    list_filter = ['status', 'course']
    search_fields = ['student_name', 'parent_email']
    readonly_fields = ['created_at']

admin.site.register(Application, ApplicationAdmin)
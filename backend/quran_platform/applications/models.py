from django.db import models
from django.contrib.auth import get_user_model
from courses.models import Course
import uuid

User = get_user_model()

class Application(models.Model):
    """When a student applies to a course"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('waiting_payment', 'Waiting for Payment'),
        ('active', 'Active Student'),
        ('completed', 'Course Completed'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    DAYS_CHOICE = [
        ('mon_wed_fri', 'Monday, Wednesday, Friday'),
        ('tue_thu_sat', 'Tuesday, Thursday, Saturday'),
        ('weekends', 'Weekends Only'),
        ('custom', 'Custom Schedule'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Student details
    student_name = models.CharField(max_length=255)
    student_age = models.IntegerField()
    student_gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')])
    
    # Parent/Guardian details
    parent_name = models.CharField(max_length=255)
    parent_email = models.EmailField()
    parent_phone = models.CharField(max_length=20)
    parent_whatsapp = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    
    # Course details
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    
    # Preferences
    preferred_days = models.CharField(max_length=20, choices=DAYS_CHOICE, default='mon_wed_fri')
    preferred_time = models.CharField(max_length=10, choices=[
        ('morning', 'Morning (7-11 AM)'),
        ('afternoon', 'Afternoon (12-4 PM)'),
        ('evening', 'Evening (5-9 PM)'),
    ], default='evening')
    
    preferred_timezone = models.CharField(max_length=50, default='UTC')
    special_requests = models.TextField(blank=True)
    
    # Student's current level (for Quran courses)
    current_quran_level = models.CharField(max_length=50, blank=True)  # e.g., "Can read with Tajweed"
    knows_arabic = models.BooleanField(default=False)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_applications')
    assigned_time_slot = models.CharField(max_length=50, blank=True)  # e.g., "Monday 5:00 PM"
    
    # Admin notes
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student_name} - {self.course.title} ({self.status})"
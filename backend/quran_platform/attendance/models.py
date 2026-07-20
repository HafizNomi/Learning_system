from django.db import models
from django.contrib.auth import get_user_model
from scheduling.models import ClassSession
import uuid

User = get_user_model()

class Attendance(models.Model):
    """Mark attendance for each session"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    session = models.OneToOneField(ClassSession, on_delete=models.CASCADE, related_name='attendance')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='marked_attendances')
    
    # Attendance status
    is_present = models.BooleanField(default=False)
    is_late = models.BooleanField(default=False)  # If student joined late
    duration_attended = models.IntegerField(default=0)  # In minutes
    
    # Teacher remarks
    teacher_remarks = models.TextField(blank=True)
    student_performance = models.CharField(max_length=20, choices=[
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('average', 'Average'),
        ('needs_improvement', 'Needs Improvement'),
    ], blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.email} - {self.session.start_time} - {'Present' if self.is_present else 'Absent'}"

class MonthlyAttendanceSummary(models.Model):
    """Monthly summary for each student"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_summaries')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE)
    
    month = models.IntegerField()  # 1-12
    year = models.IntegerField()
    
    total_sessions = models.IntegerField(default=0)
    present_sessions = models.IntegerField(default=0)
    absent_sessions = models.IntegerField(default=0)
    late_sessions = models.IntegerField(default=0)
    
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    teacher_feedback = models.TextField(blank=True)
    progress_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'course', 'month', 'year']
    
    def __str__(self):
        return f"{self.student.email} - {self.month}/{self.year} - {self.attendance_percentage}%"
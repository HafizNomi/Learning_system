from django.db import models
from django.contrib.auth import get_user_model
from courses.models import Course
import uuid

User = get_user_model()

class MonthlyReport(models.Model):
    """Student's monthly progress report"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='written_reports')
    
    # Month
    month = models.IntegerField()
    year = models.IntegerField()
    
    # Attendance stats (automatically calculated)
    total_classes = models.IntegerField(default=0)
    classes_attended = models.IntegerField(default=0)
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Progress details
    topics_covered = models.TextField(blank=True)  # What was taught
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    
    # For Quran courses
    surahs_memorized = models.TextField(blank=True)  # List of Surahs
    tajweed_improvement = models.TextField(blank=True)  # How Tajweed improved
    
    # For Tech courses
    projects_completed = models.TextField(blank=True)
    skills_acquired = models.TextField(blank=True)
    
    # Teacher's overall assessment
    teacher_comments = models.TextField()
    recommended_next_level = models.CharField(max_length=50, blank=True)
    
    # Student's self-assessment (optional)
    student_feedback = models.TextField(blank=True)
    parent_feedback = models.TextField(blank=True)
    
    # Status
    is_finalized = models.BooleanField(default=False)  # Admin final approval
    is_sent_to_parent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'course', 'month', 'year']
        ordering = ['-year', '-month']
    
    def __str__(self):
        return f"{self.student.email} - {self.month}/{self.year} Report"
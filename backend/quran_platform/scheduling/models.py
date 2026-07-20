from django.db import models
from django.contrib.auth import get_user_model
from courses.models import Course
from applications.models import Application
import uuid
from datetime import datetime
import pytz

User = get_user_model()

class ClassSession(models.Model):
    """Each individual class session"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('missed', 'Missed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who and What
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_sessions')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teacher_sessions')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='sessions')
    
    # When
    start_time = models.DateTimeField()  # ALWAYS stored in UTC
    end_time = models.DateTimeField()    # ALWAYS stored in UTC
    
    # Where (Video link)
    meeting_link = models.URLField(blank=True, null=True)
    meeting_room_id = models.CharField(max_length=100, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Notes
    teacher_notes = models.TextField(blank=True)
    student_feedback = models.TextField(blank=True)
    rating = models.IntegerField(null=True, blank=True, choices=[(i, i) for i in range(1, 6)])
    
    # Recording
    recording_url = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['start_time']
    
    def get_start_time_local(self, user_timezone):
        """Convert UTC to user's timezone"""
        try:
            tz = pytz.timezone(user_timezone)
            return self.start_time.astimezone(tz)
        except:
            return self.start_time
    
    def get_end_time_local(self, user_timezone):
        try:
            tz = pytz.timezone(user_timezone)
            return self.end_time.astimezone(tz)
        except:
            return self.end_time
    
    def is_upcoming(self):
        from django.utils import timezone
        return self.status == 'scheduled' and self.start_time > timezone.now()
    
    def __str__(self):
        return f"{self.student.email} - {self.course.title} ({self.start_time})"
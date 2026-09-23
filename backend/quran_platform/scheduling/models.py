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
    
    # Why a class was called off, shown to both sides.
    cancellation_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # How early the Join button becomes active, and how long after the end it
    # stays usable for an overrunning class.
    JOIN_OPENS_MINUTES_BEFORE = 10
    JOIN_CLOSES_MINUTES_AFTER = 15
    
    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['teacher', 'start_time']),
            models.Index(fields=['student', 'start_time']),
            models.Index(fields=['status', 'start_time']),
        ]
    
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
    
    @property
    def duration_minutes(self):
        return int((self.end_time - self.start_time).total_seconds() // 60)
    
    @property
    def join_opens_at(self):
        from datetime import timedelta
        return self.start_time - timedelta(minutes=self.JOIN_OPENS_MINUTES_BEFORE)
    
    @property
    def is_joinable(self):
        """
        True while the class is actually joinable: a link exists, it has not
        been cancelled, and we are inside the window around its slot. The
        frontend uses this to decide whether the Join button is live.
        """
        from datetime import timedelta
        from django.utils import timezone
        
        if not self.meeting_link or self.status in ('cancelled', 'completed', 'missed'):
            return False
        
        now = timezone.now()
        closes = self.end_time + timedelta(minutes=self.JOIN_CLOSES_MINUTES_AFTER)
        return self.join_opens_at <= now <= closes
    
    def __str__(self):
        return f"{self.student.email} - {self.course.title} ({self.start_time})"
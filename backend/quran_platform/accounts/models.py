import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Every person using the platform. Authenticates with email + password."""

    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_ADMIN = 'admin'

    ROLE_CHOICES = [
        (ROLE_STUDENT, 'Student'),
        (ROLE_TEACHER, 'Teacher'),
        (ROLE_ADMIN, 'Admin'),
    ]

    # Roles a visitor is allowed to pick when signing up themselves.
    SELF_SIGNUP_ROLES = [ROLE_STUDENT, ROLE_TEACHER]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    timezone = models.CharField(max_length=50, default='UTC')  # Important for scheduling
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = UserManager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_student(self):
        return self.role == self.ROLE_STUDENT

    @property
    def is_teacher(self):
        return self.role == self.ROLE_TEACHER

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_staff


class TeacherProfile(models.Model):
    """Extra details for teachers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    qualification = models.TextField(blank=True)
    teaching_experience = models.IntegerField(default=0)  # In years
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=15.00)
    available_days = models.JSONField(default=list)  # ['Monday', 'Wednesday', 'Friday']
    available_time_start = models.TimeField(null=True, blank=True)  # e.g., 09:00 AM
    available_time_end = models.TimeField(null=True, blank=True)    # e.g., 09:00 PM
    bio = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_students = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Teacher: {self.user.email}"

from django.db import models
import uuid

class Course(models.Model):
    """Available courses"""
    CATEGORY_CHOICES = [
        ('quran', 'Quran Recitation'),
        ('quran_memorization', 'Quran Memorization'),
        ('tajweed', 'Tajweed Rules'),
        ('ai', 'Artificial Intelligence'),
        ('blockchain', 'Blockchain Basics'),
        ('programming', 'Programming for Kids'),
        ('web_dev', 'Web Development'),
    ]
    
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    duration_minutes = models.IntegerField(default=45)  # Each class duration
    classes_per_week = models.IntegerField(default=3)   # How many classes per week
    thumbnail = models.ImageField(upload_to='courses/', blank=True, null=True)
    syllabus = models.TextField(blank=True)  # What will be taught
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} ({self.level})"
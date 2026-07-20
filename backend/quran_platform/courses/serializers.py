from rest_framework import serializers
from .models import Course

class CourseSerializer(serializers.ModelSerializer):
    """Convert Course model to JSON and back"""
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'price_per_month', 'duration_minutes', 'classes_per_week',
            'thumbnail', 'syllabus', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
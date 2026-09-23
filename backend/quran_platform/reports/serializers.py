import calendar

from rest_framework import serializers
from .models import MonthlyReport


def display_name(user):
    """Full name where we have one, otherwise something recognisable."""
    if not user:
        return ''
    return user.get_full_name() or user.username or user.email


class MonthlyReportSerializer(serializers.ModelSerializer):
    """Convert Monthly Report to JSON"""
    
    student_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_category = serializers.CharField(source='course.category', read_only=True)
    period = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyReport
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'course_category', 'teacher', 'teacher_name', 'month', 'year',
            'period',
            'total_classes', 'classes_attended', 'attendance_percentage',
            'topics_covered', 'strengths', 'areas_for_improvement',
            'surahs_memorized', 'tajweed_improvement',
            'projects_completed', 'skills_acquired',
            'teacher_comments', 'recommended_next_level',
            'student_feedback', 'parent_feedback',
            'is_finalized', 'is_sent_to_parent', 'created_at'
        ]
        read_only_fields = [
            'id', 'total_classes', 'classes_attended', 'attendance_percentage',
            'created_at',
        ]
    
    def get_student_name(self, obj):
        return display_name(obj.student)
    
    def get_teacher_name(self, obj):
        return display_name(obj.teacher)
    
    def get_period(self, obj):
        """"September 2026" - so the UI never has to map month numbers."""
        try:
            return f'{calendar.month_name[obj.month]} {obj.year}'
        except (IndexError, TypeError):
            return f'{obj.month}/{obj.year}'

from rest_framework import serializers
from .models import MonthlyReport

class MonthlyReportSerializer(serializers.ModelSerializer):
    """Convert Monthly Report to JSON"""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = MonthlyReport
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'teacher', 'teacher_name', 'month', 'year',
            'total_classes', 'classes_attended', 'attendance_percentage',
            'topics_covered', 'strengths', 'areas_for_improvement',
            'surahs_memorized', 'tajweed_improvement',
            'projects_completed', 'skills_acquired',
            'teacher_comments', 'recommended_next_level',
            'student_feedback', 'parent_feedback',
            'is_finalized', 'is_sent_to_parent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
from rest_framework import serializers
from .models import ClassSession
from django.contrib.auth import get_user_model

User = get_user_model()

class ClassSessionSerializer(serializers.ModelSerializer):
    """Convert Class Session to JSON"""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    # Local time display (converted from UTC)
    start_time_local = serializers.SerializerMethodField()
    end_time_local = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassSession
        fields = [
            'id', 'student', 'student_name', 'teacher', 'teacher_name',
            'course', 'course_title', 'start_time', 'end_time',
            'start_time_local', 'end_time_local', 'meeting_link',
            'meeting_room_id', 'status', 'teacher_notes', 'student_feedback',
            'rating', 'recording_url', 'created_at'
        ]
        read_only_fields = ['id', 'meeting_link', 'created_at']
    
    def get_start_time_local(self, obj):
        """Convert UTC to user's timezone"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_timezone = request.user.timezone
            return obj.get_start_time_local(user_timezone)
        return obj.start_time
    
    def get_end_time_local(self, obj):
        """Convert UTC to user's timezone"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_timezone = request.user.timezone
            return obj.get_end_time_local(user_timezone)
        return obj.end_time
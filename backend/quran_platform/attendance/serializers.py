from rest_framework import serializers
from .models import Attendance, MonthlyAttendanceSummary

def display_name(user):
    """Full name where we have one, otherwise something recognisable."""
    if not user:
        return ''
    return user.get_full_name() or user.username or user.email


class AttendanceSerializer(serializers.ModelSerializer):
    """Mark attendance for a session"""
    
    student_name = serializers.SerializerMethodField()
    session_time = serializers.DateTimeField(source='session.start_time', read_only=True)
    course_title = serializers.CharField(source='session.course.title', read_only=True)
    performance_display = serializers.CharField(
        source='get_student_performance_display', read_only=True,
    )
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'session', 'student', 'student_name', 'teacher',
            'is_present', 'is_late', 'duration_attended',
            'teacher_remarks', 'student_performance', 'performance_display',
            'session_time', 'course_title', 'created_at'
        ]
        read_only_fields = ['id', 'student', 'teacher', 'created_at']
    
    def get_student_name(self, obj):
        return display_name(obj.student)
    
    def validate(self, data):
        """Ensure session is not in the future"""
        from django.utils import timezone
        session = data.get('session')
        if session and session.start_time > timezone.now():
            raise serializers.ValidationError("Cannot mark attendance for future sessions")
        return data

class MonthlyAttendanceSummarySerializer(serializers.ModelSerializer):
    """Show monthly attendance summary"""
    
    student_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    period = serializers.SerializerMethodField()
    
    def get_student_name(self, obj):
        return display_name(obj.student)
    
    def get_period(self, obj):
        import calendar
        try:
            return f'{calendar.month_name[obj.month]} {obj.year}'
        except (IndexError, TypeError):
            return f'{obj.month}/{obj.year}'
    
    class Meta:
        model = MonthlyAttendanceSummary
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'month', 'year', 'period', 'total_sessions', 'present_sessions', 'absent_sessions',
            'late_sessions', 'attendance_percentage', 'teacher_feedback',
            'progress_notes'
        ]
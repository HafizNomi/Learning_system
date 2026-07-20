from rest_framework import serializers
from .models import Attendance, MonthlyAttendanceSummary

class AttendanceSerializer(serializers.ModelSerializer):
    """Mark attendance for a session"""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    session_time = serializers.DateTimeField(source='session.start_time', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'session', 'student', 'student_name', 'teacher',
            'is_present', 'is_late', 'duration_attended',
            'teacher_remarks', 'student_performance', 'session_time',
            'created_at'
        ]
        read_only_fields = ['id', 'student', 'teacher', 'created_at']
    
    def validate(self, data):
        """Ensure session is not in the future"""
        from django.utils import timezone
        session = data.get('session')
        if session and session.start_time > timezone.now():
            raise serializers.ValidationError("Cannot mark attendance for future sessions")
        return data

class MonthlyAttendanceSummarySerializer(serializers.ModelSerializer):
    """Show monthly attendance summary"""
    
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    
    class Meta:
        model = MonthlyAttendanceSummary
        fields = [
            'id', 'student', 'student_name', 'course', 'month', 'year',
            'total_sessions', 'present_sessions', 'absent_sessions',
            'late_sessions', 'attendance_percentage', 'teacher_feedback',
            'progress_notes'
        ]
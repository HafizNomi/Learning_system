from rest_framework import serializers
from .models import Application
from courses.models import Course
from django.contrib.auth import get_user_model

User = get_user_model()

class ApplicationSerializer(serializers.ModelSerializer):
    """Convert Application model to JSON"""
    
    # Show course details instead of just ID
    course_details = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'student_name', 'student_age', 'student_gender',
            'parent_name', 'parent_email', 'parent_phone', 'parent_whatsapp',
            'course', 'course_details', 'preferred_days', 'preferred_time',
            'preferred_timezone', 'special_requests', 'current_quran_level',
            'knows_arabic', 'status', 'status_display', 'assigned_teacher',
            'assigned_time_slot', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'assigned_teacher', 'created_at', 'updated_at']
    
    def get_course_details(self, obj):
        """Return course information"""
        return {
            'id': obj.course.id,
            'title': obj.course.title,
            'category': obj.course.category,
            'level': obj.course.level,
            'price': str(obj.course.price_per_month)
        }
    
    def validate_parent_email(self, value):
        """Check if email is valid"""
        if '@' not in value:
            raise serializers.ValidationError("Invalid email address")
        return value
    
    def validate_student_age(self, value):
        """Check age is reasonable"""
        if value < 4 or value > 18:
            raise serializers.ValidationError("Age must be between 4 and 18")
        return value

class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    """For admin to update application status"""
    
    class Meta:
        model = Application
        fields = ['status', 'assigned_teacher', 'assigned_time_slot', 'admin_notes']
    
    def validate(self, data):
        """Ensure proper workflow"""
        if data.get('status') == 'approved' and not data.get('assigned_teacher'):
            raise serializers.ValidationError({
                'assigned_teacher': 'Must assign a teacher when approving'
            })
        return data
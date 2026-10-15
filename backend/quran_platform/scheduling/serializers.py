from urllib.parse import urlparse

from rest_framework import serializers
from .models import ClassSession
from django.contrib.auth import get_user_model

User = get_user_model()


def display_name(user):
    """Full name where we have one, otherwise something recognisable."""
    if not user:
        return ''
    return user.get_full_name() or user.username or user.email


class ClassSessionSerializer(serializers.ModelSerializer):
    """Convert Class Session to JSON"""
    
    student_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Local time display (converted from UTC)
    start_time_local = serializers.SerializerMethodField()
    end_time_local = serializers.SerializerMethodField()
    viewer_timezone = serializers.SerializerMethodField()
    
    duration_minutes = serializers.IntegerField(read_only=True)
    join_opens_at = serializers.DateTimeField(read_only=True)
    is_joinable = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ClassSession
        fields = [
            'id', 'student', 'student_name', 'teacher', 'teacher_name',
            'course', 'course_title', 'application',
            'start_time', 'end_time', 'start_time_local', 'end_time_local',
            'viewer_timezone', 'duration_minutes',
            'meeting_link', 'meeting_room_id', 'join_opens_at', 'is_joinable',
            'status', 'status_display', 'cancellation_reason',
            'teacher_notes', 'student_feedback', 'rating', 'recording_url',
            'created_at',
        ]
        read_only_fields = [
            'id', 'student', 'teacher', 'course', 'application',
            'start_time', 'end_time', 'created_at',
        ]
    
    def get_student_name(self, obj):
        return display_name(obj.student)
    
    def get_teacher_name(self, obj):
        return display_name(obj.teacher)
    
    def _viewer_timezone(self):
        """The timezone to render times in: the signed-in user's, else UTC."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.timezone or 'UTC'
        return 'UTC'
    
    def get_viewer_timezone(self, obj):
        return self._viewer_timezone()
    
    def get_start_time_local(self, obj):
        """Convert UTC to user's timezone"""
        return obj.get_start_time_local(self._viewer_timezone())
    
    def get_end_time_local(self, obj):
        """Convert UTC to user's timezone"""
        return obj.get_end_time_local(self._viewer_timezone())
    
    # Hosts a class may be held on. Subdomains are allowed (Zoom hands out
    # us02web.zoom.us and similar), but only as a real subdomain.
    ALLOWED_MEETING_HOSTS = (
        'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'whereby.com',
    )
    
    def validate_meeting_link(self, value):
        """
        Teachers paste a Google Meet link by hand, so catch the usual slips
        before a student is sent somewhere that doesn't work.
        
        The host is compared against the parsed hostname, never by substring:
        `https://evil.example.com/?next=meet.google.com` contains an allowed
        host but is not one, and would otherwise become the link students click.
        """
        if not value:
            return value
        
        link = value.strip()
        if not link.startswith(('http://', 'https://')):
            link = f'https://{link}'
        
        parsed = urlparse(link)
        if parsed.scheme not in ('http', 'https'):
            raise serializers.ValidationError('That is not a valid meeting link.')
        
        host = (parsed.hostname or '').lower().rstrip('.')
        allowed = any(
            host == permitted or host.endswith(f'.{permitted}')
            for permitted in self.ALLOWED_MEETING_HOSTS
        )
        if not allowed:
            raise serializers.ValidationError(
                'Paste a meeting link from Google Meet, Zoom, Teams or Whereby.'
            )
        return link


class SessionRescheduleSerializer(serializers.Serializer):
    """Move a class, cancel it, or attach the meeting link."""
    
    start_time = serializers.DateTimeField(required=False)
    status = serializers.ChoiceField(
        choices=ClassSession.STATUS_CHOICES, required=False,
    )
    meeting_link = serializers.CharField(required=False, allow_blank=True)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
    teacher_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if not data:
            raise serializers.ValidationError('Nothing to update.')
        # 'ongoing' is set while a class is running. UpcomingSessionsView has
        # to include it or the class disappears from the student's screen
        # mid-lesson - see the status filter there.
        if data.get('status') == 'cancelled' and not data.get('cancellation_reason'):
            raise serializers.ValidationError({
                'cancellation_reason': 'Say why the class is being cancelled.'
            })
        return data
    
    def validate_meeting_link(self, value):
        return ClassSessionSerializer().validate_meeting_link(value)


class GenerateSessionsSerializer(serializers.Serializer):
    """
    Create a run of classes in one go.
    
    `time_of_day` is read in `timezone` - the family's local time, not UTC -
    because that is how a parent thinks about "5pm on Monday".
    """
    
    DAY_PRESETS = {
        'mon_wed_fri': [0, 2, 4],
        'tue_thu_sat': [1, 3, 5],
        'weekends': [5, 6],
    }
    
    application_id = serializers.UUIDField()
    start_date = serializers.DateField()
    weeks = serializers.IntegerField(min_value=1, max_value=12, default=4)
    time_of_day = serializers.TimeField()
    timezone = serializers.CharField(required=False, allow_blank=True)
    # 0 = Monday ... 6 = Sunday. Defaults to the application's preferred days.
    weekdays = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False, allow_empty=False,
    )
    duration_minutes = serializers.IntegerField(
        min_value=15, max_value=240, required=False,
    )
    
    def validate_timezone(self, value):
        import pytz
        if value and value not in pytz.all_timezones_set:
            raise serializers.ValidationError(f'Unknown timezone: {value}')
        return value

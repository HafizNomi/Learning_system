from rest_framework import serializers

from .models import Course, CourseLesson


def can_watch(user, lesson):
    """
    Who may be given the video link for a lesson.

    Preview lessons are open to everyone - they are the shop window. Everything
    else is for people who have a reason to be there: staff, teachers, and
    students enrolled on that course. Without this, the whole course library
    would be free to any visitor, and there would be little left to pay for.
    """
    if lesson.is_preview:
        return True
    if not (user and user.is_authenticated):
        return False
    if user.is_staff or user.role in ('admin', 'teacher'):
        return True

    # Enrolled: the student has an application for this course that got past
    # review. A withdrawn or rejected application does not grant access.
    from applications.models import Application
    return Application.objects.filter(
        student=user,
        course=lesson.course_id,
        status__in=['approved', 'waiting_payment', 'active', 'completed'],
    ).exists()


class CourseLessonSerializer(serializers.ModelSerializer):
    """
    One recorded lesson.

    The video fields are only filled in for viewers allowed to watch. Everyone
    else still sees the lesson exists, with `is_locked` true, so the course
    page can show what is inside without giving it away.
    """

    video_id = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    watch_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = CourseLesson
        fields = [
            'id', 'course', 'title', 'description', 'order', 'duration_minutes',
            'is_preview', 'is_published', 'video_id', 'embed_url', 'watch_url',
            'thumbnail_url', 'is_locked', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            # Write-only: clients get the id and the embed URL instead, so a
            # locked lesson never leaks its link through this field.
            'youtube_url': {'write_only': True},
        }

    def _allowed(self, lesson):
        request = self.context.get('request')
        return can_watch(getattr(request, 'user', None), lesson)

    def get_is_locked(self, obj):
        return not self._allowed(obj)

    def get_video_id(self, obj):
        return obj.video_id if self._allowed(obj) else None

    def get_embed_url(self, obj):
        return obj.embed_url if self._allowed(obj) else None

    def get_watch_url(self, obj):
        return obj.watch_url if self._allowed(obj) else None

    def get_thumbnail_url(self, obj):
        # The poster image is harmless, and a locked lesson looks far better
        # with its thumbnail behind the padlock than with an empty grey box.
        return obj.thumbnail_url


class CourseSerializer(serializers.ModelSerializer):
    """Convert Course model to JSON and back"""

    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'level',
            'price_per_month', 'duration_minutes', 'classes_per_week',
            'thumbnail', 'syllabus', 'is_active', 'lesson_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_lesson_count(self, obj):
        # Uses the annotation from the list view when present, so the course
        # list does not run one count query per row.
        annotated = getattr(obj, 'published_lesson_count', None)
        if annotated is not None:
            return annotated
        return obj.lessons.filter(is_published=True).count()


class CourseDetailSerializer(CourseSerializer):
    """The course page: everything above, plus its recorded lessons."""

    lessons = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['lessons']

    def get_lessons(self, obj):
        lessons = obj.lessons.filter(is_published=True)
        return CourseLessonSerializer(lessons, many=True, context=self.context).data

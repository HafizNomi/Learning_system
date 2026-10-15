from django.contrib import admin
from django.utils.html import format_html

from .models import Course, CourseLesson


class CourseLessonInline(admin.TabularInline):
    """Paste the YouTube links for a course right on the course page."""

    model = CourseLesson
    extra = 1
    fields = ['order', 'title', 'youtube_url', 'duration_minutes', 'is_published', 'is_preview', 'preview_thumb']
    readonly_fields = ['preview_thumb']
    ordering = ['order']

    @admin.display(description='Video')
    def preview_thumb(self, obj):
        """Proof the link actually resolved to a video, before students find out."""
        if not obj or not obj.pk:
            return '—'
        if not obj.video_id:
            return format_html('<span style="color:#c62828;">✗ not a YouTube link</span>')
        return format_html(
            '<a href="{}" target="_blank" rel="noopener">'
            '<img src="{}" style="height:45px;border-radius:3px;"></a>',
            obj.watch_url, obj.thumbnail_url,
        )


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """The course catalogue, as staff see and edit it."""

    list_display = [
        'title',
        'category',
        'level',
        'monthly_price',
        'schedule',
        'is_active',
        'created_at',
    ]
    list_filter = ['category', 'level', 'is_active', 'created_at']
    list_editable = ['is_active']
    search_fields = ['title', 'description', 'syllabus']
    ordering = ['category', 'title']
    readonly_fields = ['id', 'created_at']
    list_per_page = 50
    inlines = [CourseLessonInline]

    fieldsets = (
        ('What the course is', {
            'fields': ('id', 'title', 'category', 'level', 'description'),
        }),
        ('Syllabus', {
            'fields': ('syllabus',),
            'description': 'Shown to parents on the course page. One line per week works well.',
        }),
        ('Price and schedule', {
            'fields': ('price_per_month', 'duration_minutes', 'classes_per_week'),
        }),
        ('Presentation', {
            'fields': ('thumbnail', 'is_active'),
            'description': 'Unticking "is active" hides the course from the public catalogue.',
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Price', ordering='price_per_month')
    def monthly_price(self, obj):
        return f'${obj.price_per_month}/mo'

    @admin.display(description='Schedule')
    def schedule(self, obj):
        return f'{obj.classes_per_week}× {obj.duration_minutes} min per week'

    @admin.display(description='Live', boolean=True, ordering='is_active')
    def live(self, obj):
        return obj.is_active


@admin.register(CourseLesson)
class CourseLessonAdmin(admin.ModelAdmin):
    """Recorded lessons across every course."""

    list_display = ['title', 'course', 'order', 'duration_minutes', 'is_published', 'is_preview', 'video_check']
    list_filter = ['is_published', 'is_preview', 'course__category', 'course']
    list_editable = ['order', 'is_published', 'is_preview']
    search_fields = ['title', 'description', 'youtube_url', 'course__title']
    ordering = ['course', 'order']
    autocomplete_fields = ['course']
    readonly_fields = ['id', 'created_at', 'updated_at', 'video_preview']

    fieldsets = (
        ('Lesson', {'fields': ('id', 'course', 'title', 'description')}),
        ('Video', {
            'fields': ('youtube_url', 'video_preview', 'duration_minutes'),
            'description': (
                'Upload the recording to YouTube and set it to <b>Unlisted</b>, then paste the '
                'link here. Unlisted videos do not show in search or on your channel, so only '
                'people given the link can watch.'
            ),
        }),
        ('Visibility', {
            'fields': ('order', 'is_published', 'is_preview'),
            'description': (
                'A preview lesson can be watched by anyone. Other lessons are only shown to '
                'students enrolled on this course.'
            ),
        }),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('course')

    @admin.display(description='Link OK?')
    def video_check(self, obj):
        if obj.video_id:
            return format_html('<span style="color:#2e7d32;">✓ {}</span>', obj.video_id)
        return format_html('<span style="color:#c62828;">✗ bad link</span>')

    @admin.display(description='Preview')
    def video_preview(self, obj):
        """Watch it here, so a wrong link is caught before a student hits it."""
        if not obj or not obj.video_id:
            return 'Save a valid YouTube link to preview the video here.'
        return format_html(
            '<iframe width="480" height="270" src="{}" frameborder="0" '
            'allowfullscreen style="border-radius:6px;"></iframe>',
            obj.embed_url,
        )

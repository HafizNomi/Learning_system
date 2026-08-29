from django.contrib import admin
from django.utils.html import format_html

from .models import Course


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

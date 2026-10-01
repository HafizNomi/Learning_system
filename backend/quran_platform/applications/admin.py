from django.contrib import admin, messages

from .models import Application
from .services import ApprovalError, handle_status_change


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """
    Course applications, as staff see them.

    Saving here runs the same service the API uses. Previously the admin just
    wrote the row, so setting status to `approved` left an application that
    looked accepted but had no student login and no teacher - and nobody could
    sign in.
    """

    list_display = [
        'student_name',
        'course',
        'status',
        'assigned_teacher',
        'student',
        'created_at',
    ]
    list_filter = ['status', 'course', 'preferred_days', 'created_at']
    search_fields = ['student_name', 'parent_name', 'parent_email', 'parent_phone']
    readonly_fields = ['id', 'student', 'created_at', 'updated_at']
    autocomplete_fields = []
    date_hierarchy = 'created_at'
    list_per_page = 50

    fieldsets = (
        ('Student', {
            'fields': ('id', 'student_name', 'student_age', 'student_gender',
                       'current_quran_level', 'knows_arabic'),
        }),
        ('Parent / guardian', {
            'fields': ('parent_name', 'parent_email', 'parent_phone',
                       'parent_whatsapp', 'address'),
        }),
        ('Course and preferences', {
            'fields': ('course', 'preferred_days', 'preferred_time',
                       'preferred_timezone', 'special_requests'),
        }),
        ('Decision', {
            'description': (
                'Setting the status to <strong>Approved</strong> creates the '
                'student&rsquo;s login and emails them a link to choose a '
                'password. A teacher must be assigned first.'
            ),
            'fields': ('status', 'assigned_teacher', 'assigned_time_slot',
                       'student', 'admin_notes'),
        }),
        ('Dates', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Only teachers belong in the teacher dropdown."""
        if db_field.name == 'assigned_teacher':
            kwargs['queryset'] = db_field.remote_field.model.objects.filter(role='teacher')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        """Save, then run whatever the new status requires."""
        status_changed = (not change) or ('status' in form.changed_data)
        super().save_model(request, obj, form, change)

        if not status_changed:
            return

        try:
            _, account_created = handle_status_change(obj, obj.status)
        except ApprovalError as exc:
            # The row is saved but incomplete, so say so plainly rather than
            # letting staff believe the student can now log in.
            self.message_user(
                request,
                f'{exc} The application was saved but is not fully approved.',
                level=messages.ERROR,
            )
            return

        if obj.status == 'approved':
            self.message_user(
                request,
                (
                    f'Login created for {obj.parent_email} and a set-password '
                    'link emailed.'
                    if account_created else
                    f'Linked to the existing account for {obj.parent_email}.'
                ),
                level=messages.SUCCESS,
            )

    @admin.action(description='Approve selected applications')
    def approve_selected(self, request, queryset):
        approved, blocked = 0, []
        for application in queryset:
            application.status = 'approved'
            try:
                handle_status_change(application, 'approved')
            except ApprovalError:
                blocked.append(application.student_name)
                continue
            application.save(update_fields=['status', 'updated_at'])
            approved += 1

        if approved:
            self.message_user(request, f'Approved {approved}.', messages.SUCCESS)
        if blocked:
            self.message_user(
                request,
                'Needs a teacher first: ' + ', '.join(blocked),
                messages.WARNING,
            )

    actions = ['approve_selected']

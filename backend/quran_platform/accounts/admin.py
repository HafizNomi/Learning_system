from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .emails import send_account_created
from .models import OutboundEmail, TeacherProfile, User


class TeacherProfileInline(admin.StackedInline):
    model = TeacherProfile
    can_delete = False
    extra = 0
    verbose_name_plural = _('Teacher profile')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin tuned for a custom user that logs in with an email address."""

    list_display = ['email', 'username', 'role', 'is_verified', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active', 'is_staff', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'last_login', 'date_joined']
    actions = ['mark_verified']

    fieldsets = (
        (None, {'fields': ('id', 'email', 'password')}),
        (_('Personal info'), {'fields': ('username', 'first_name', 'last_name', 'phone', 'profile_picture')}),
        (_('Platform'), {'fields': ('role', 'timezone', 'is_verified')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined', 'created_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'role', 'password1', 'password2'),
        }),
    )

    def get_inlines(self, request, obj=None):
        return [TeacherProfileInline] if obj and obj.role == User.ROLE_TEACHER else []

    def save_model(self, request, obj, form, change):
        """
        Email a new account its create-password link.

        Teachers are added here rather than signing up, so without this they
        would have an account and no way to get into it - the admin types a
        password they then have to pass on by hand, which nobody should do.
        """
        creating = not change
        super().save_model(request, obj, form, change)

        if not creating or not obj.email:
            return

        # A teacher cannot teach without the profile the scheduling app reads.
        if obj.role == User.ROLE_TEACHER:
            TeacherProfile.objects.get_or_create(user=obj)

        record = send_account_created(obj)

        if record.status == OutboundEmail.STATUS_SENT:
            self.message_user(
                request,
                f'Sent {obj.email} a link to create their password.',
                messages.SUCCESS,
            )
        elif record.status == OutboundEmail.STATUS_FAILED:
            self.message_user(
                request,
                f'Account created, but the email to {obj.email} could not be sent. '
                f'Open it in the Outbox and send it by hand.',
                messages.ERROR,
            )
        else:
            # Manual mode: nothing was delivered, and saying otherwise would
            # leave the teacher waiting for an email that is never coming.
            self.message_user(
                request,
                f'Account created. Open the Outbox to copy the create-password '
                f'email and send it to {obj.email}.',
                messages.WARNING,
            )

    @admin.action(description='Mark selected users as email-verified')
    def mark_verified(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} user(s) marked as verified.')


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'teaching_experience', 'hourly_rate', 'rating', 'total_students', 'is_active']
    list_filter = ['is_active', 'teaching_experience']
    search_fields = ['user__email', 'user__username', 'qualification', 'bio']
    autocomplete_fields = ['user']
    readonly_fields = ['rating', 'total_students']


@admin.register(OutboundEmail)
class OutboundEmailAdmin(admin.ModelAdmin):
    """
    The Outbox: every email the platform has produced.

    Open one, copy the link or the whole message, send it from your own email
    account, then tick it off with the "Mark as sent" action.
    """

    list_display = ['created_at', 'subject', 'recipient', 'status_badge', 'has_link']
    list_filter = ['status', 'created_at']
    search_fields = ['recipient', 'subject', 'text_body']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    list_per_page = 50
    actions = ['mark_as_sent']

    readonly_fields = [
        'id', 'recipient', 'subject', 'status', 'sent_at', 'created_at',
        'error', 'copy_link', 'copy_body', 'preview',
    ]

    fieldsets = (
        ('Send this to', {
            'fields': ('recipient', 'subject', 'status', 'sent_at'),
        }),
        ('The important link', {
            'fields': ('copy_link',),
            'description': (
                'If the person only needs one thing from this email, it is this link. '
                'Sending them just this is enough.'
            ),
        }),
        ('Message to copy', {
            'fields': ('copy_body',),
            'description': 'Select all of this and paste it into your email.',
        }),
        ('How it looks', {
            'fields': ('preview',),
            'classes': ('collapse',),
        }),
        ('Details', {
            'fields': ('id', 'created_at', 'error'),
            'classes': ('collapse',),
        }),
    )

    def has_add_permission(self, request):
        # Emails are produced by the platform, never typed in here.
        return False

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colours = {
            obj.STATUS_SENT: ('#2e7d32', '✓ sent'),
            obj.STATUS_PENDING: ('#b26a00', '● needs sending'),
            obj.STATUS_FAILED: ('#c62828', '✗ failed'),
        }
        colour, label = colours.get(obj.status, ('#666', obj.status))
        return format_html('<b style="color:{};">{}</b>', colour, label)

    @admin.display(description='Link?', boolean=True)
    def has_link(self, obj):
        return bool(obj.action_url)

    @admin.display(description='Link')
    def copy_link(self, obj):
        if not obj.action_url:
            return 'This email has no link in it.'
        # A full-width input is the most reliable "copy this" control there is:
        # clicking it selects everything, and it works in every browser.
        return format_html(
            '<div>'
            '<input type="text" value="{}" readonly onclick="this.select();" '
            'style="width:100%;max-width:700px;padding:9px;font-family:monospace;'
            'font-size:12px;border:1px solid #bbb;border-radius:4px;">'
            '<p style="margin:6px 0 0;color:#666;">Click the box to select it, then copy. '
            'Label on the button: <b>{}</b></p>'
            '</div>',
            obj.action_url, obj.action_label or 'Open',
        )

    @admin.display(description='Message')
    def copy_body(self, obj):
        return format_html(
            '<textarea readonly onclick="this.select();" rows="18" '
            'style="width:100%;max-width:700px;padding:10px;font-family:monospace;'
            'font-size:12px;border:1px solid #bbb;border-radius:4px;">{}</textarea>',
            obj.text_body,
        )

    @admin.display(description='Preview')
    def preview(self, obj):
        if not obj.html_body:
            return 'No HTML version.'
        return format_html(
            '<iframe srcdoc="{}" style="width:100%;max-width:700px;height:520px;'
            'border:1px solid #ddd;border-radius:6px;background:#fff;"></iframe>',
            obj.html_body,
        )

    @admin.action(description='Mark as sent (I sent this by hand)')
    def mark_as_sent(self, request, queryset):
        updated = 0
        for record in queryset.exclude(status=OutboundEmail.STATUS_SENT):
            record.mark_sent()
            updated += 1
        self.message_user(request, f'{updated} email(s) marked as sent.', messages.SUCCESS)

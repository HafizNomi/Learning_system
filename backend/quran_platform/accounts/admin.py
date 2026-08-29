from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import TeacherProfile, User


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

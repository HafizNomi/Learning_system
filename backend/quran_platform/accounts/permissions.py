from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """Allow access only to authenticated users with the `student` role."""

    message = 'Only students may perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')


class IsTeacher(permissions.BasePermission):
    """Allow access only to authenticated users with the `teacher` role."""

    message = 'Only teachers may perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'teacher')


class IsAdmin(permissions.BasePermission):
    """Allow access only to platform admins (role `admin` or Django staff)."""

    message = 'Only administrators may perform this action.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == 'admin' or user.is_staff))


class IsVerified(permissions.BasePermission):
    """Allow access only to users who have confirmed their email address."""

    message = 'Please verify your email address to continue.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_verified)


class IsOwnerOrAdmin(permissions.BasePermission):
    """Object-level check: the owning user, or an admin, may act on the object."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'admin' or user.is_staff:
            return True
        owner = getattr(obj, 'user', obj)
        return owner == user

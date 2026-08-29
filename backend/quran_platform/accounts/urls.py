from django.urls import path

from .views import (
    ChangePasswordView,
    CurrentUserView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshTokenView,
    RegisterView,
    ResendVerificationView,
    TeacherDetailView,
    TeacherListView,
    TeacherProfileView,
    UserProfileView,
    VerifyEmailView,
    VerifyTokenView,
)

app_name = 'accounts'

urlpatterns = [
    # --- Registration & login ---------------------------------------------
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # JWT lifecycle. `token/` is kept as an alias for `login/` so existing
    # SimpleJWT-style clients keep working.
    path('token/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('token/verify/', VerifyTokenView.as_view(), name='token_verify'),

    # --- Passwords ---------------------------------------------------------
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # --- Email verification ------------------------------------------------
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('verify-email/resend/', ResendVerificationView.as_view(), name='resend_verification'),

    # --- Profiles ----------------------------------------------------------
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('teacher-profile/', TeacherProfileView.as_view(), name='teacher_profile'),
    path('teachers/', TeacherListView.as_view(), name='teacher_list'),
    path('teachers/<int:pk>/', TeacherDetailView.as_view(), name='teacher_detail'),
]

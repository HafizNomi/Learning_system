from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from . import emails
from .models import TeacherProfile
from .permissions import IsTeacher
from .serializers import (
    ChangePasswordSerializer,
    EmailVerificationSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    TeacherProfileSerializer,
    UserSerializer,
)

User = get_user_model()


def token_pair(user):
    """Issue a fresh refresh/access pair for a user."""
    refresh = LoginSerializer.get_token(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


# ---------------------------------------------------------------------------
# Registration & login
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/

    Create a student or teacher account. Returns the new user together with a
    JWT pair, so the client can sign the user straight in.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Sent outside the atomic block's failure path, and best-effort inside.
        emails.send_email_verification(user)

        return Response(
            {
                'message': 'Registration successful. Please check your email to verify your address.',
                'user': UserSerializer(user, context=self.get_serializer_context()).data,
                **token_pair(user),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """
    POST /api/accounts/login/  (alias: /api/accounts/token/)

    Exchange email + password for an access/refresh pair plus the user object.
    """

    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class RefreshTokenView(TokenRefreshView):
    """POST /api/accounts/token/refresh/ - trade a refresh token for a new access token."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'token_refresh'


class VerifyTokenView(TokenVerifyView):
    """POST /api/accounts/token/verify/ - check whether a token is still valid."""

    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """
    POST /api/accounts/logout/

    Blacklist the supplied refresh token. The client should also drop its
    access token, which stays technically valid until it expires.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class CurrentUserView(generics.RetrieveAPIView):
    """GET /api/accounts/me/ - the signed-in user, for hydrating the client on boot."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET|PATCH|PUT /api/accounts/profile/

    Read or update the signed-in user's own profile. Email, role and
    verification status are deliberately read-only here.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class TeacherProfileView(generics.RetrieveUpdateAPIView):
    """GET|PATCH|PUT /api/accounts/teacher-profile/ - the signed-in teacher's own profile."""

    serializer_class = TeacherProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_object(self):
        profile, _ = TeacherProfile.objects.get_or_create(user=self.request.user)
        return profile


class TeacherListView(generics.ListAPIView):
    """GET /api/accounts/teachers/ - public directory of active teachers."""

    serializer_class = TeacherProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = (
        TeacherProfile.objects
        .select_related('user')
        .filter(is_active=True, user__is_active=True)
        .order_by('-rating')
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'qualification', 'bio']
    ordering_fields = ['rating', 'hourly_rate', 'teaching_experience', 'total_students']


class TeacherDetailView(generics.RetrieveAPIView):
    """GET /api/accounts/teachers/<uuid:pk>/ - a single teacher's public profile."""

    serializer_class = TeacherProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = TeacherProfile.objects.select_related('user').filter(is_active=True, user__is_active=True)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

class ChangePasswordView(APIView):
    """
    POST /api/accounts/change-password/

    Requires the current password. All outstanding refresh tokens are revoked,
    so other sessions are signed out, and a fresh pair is returned.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        revoked = revoke_all_refresh_tokens(user)
        emails.send_password_changed_notice(user)

        return Response(
            {
                'message': 'Password changed successfully. Other sessions have been signed out.',
                'sessions_revoked': revoked,
                **token_pair(user),
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    POST /api/accounts/password-reset/

    Emails a reset link. Always answers 200 with the same body, so the endpoint
    cannot be used to discover which addresses are registered.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.get_user()
        if user is not None:
            emails.send_password_reset(user)

        return Response(
            {'message': 'If an account exists for that email, a reset link is on its way.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/accounts/password-reset/confirm/

    Set a new password using the uid + token from the emailed link. Existing
    refresh tokens are revoked, because a reset usually means a lost account.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        revoke_all_refresh_tokens(user)
        emails.send_password_changed_notice(user)

        return Response(
            {'message': 'Password has been reset. You can now sign in with your new password.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

class VerifyEmailView(APIView):
    """POST /api/accounts/verify-email/ - confirm an address with uid + token."""

    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        message = (
            'This email address was already verified.'
            if serializer.already_verified
            else 'Email verified successfully.'
        )
        return Response(
            {'message': message, 'user': UserSerializer(user, context={'request': request}).data},
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(APIView):
    """
    POST /api/accounts/verify-email/resend/

    Send a fresh verification link. Like the reset endpoint, the response does
    not reveal whether the address exists or is already verified.
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = ResendVerificationSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'verify_email'

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.get_user()
        if user is not None:
            emails.send_email_verification(user)

        return Response(
            {'message': 'If that address needs verifying, a new link is on its way.'},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def revoke_all_refresh_tokens(user):
    """
    Blacklist every outstanding refresh token for a user.

    Returns the number of tokens revoked, or 0 when the blacklist app is not
    installed (in which case tokens simply expire on their own schedule).
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )
    except ImportError:
        return 0

    revoked = 0
    for token in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        revoked += int(created)
    return revoked

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TeacherProfile
from .tokens import email_verification_token

User = get_user_model()


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------

class TeacherProfileSerializer(serializers.ModelSerializer):
    """A teacher's public/teaching details."""

    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherProfile
        fields = [
            'id', 'email', 'username', 'full_name', 'qualification',
            'teaching_experience', 'hourly_rate', 'available_days',
            'available_time_start', 'available_time_end', 'bio', 'rating',
            'total_students', 'is_active',
        ]
        read_only_fields = ['id', 'rating', 'total_students']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def validate(self, attrs):
        start = attrs.get('available_time_start', getattr(self.instance, 'available_time_start', None))
        end = attrs.get('available_time_end', getattr(self.instance, 'available_time_end', None))
        if start and end and start >= end:
            raise serializers.ValidationError({
                'available_time_end': 'End of availability must be after its start.'
            })
        return attrs

    def validate_available_days(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Expected a list of weekday names.')
        valid = {'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'}
        unknown = [day for day in value if day not in valid]
        if unknown:
            raise serializers.ValidationError(f'Unknown weekday(s): {", ".join(map(str, unknown))}.')
        return value


class UserSerializer(serializers.ModelSerializer):
    """The authenticated user's own profile - readable and updatable."""

    full_name = serializers.SerializerMethodField()
    teacher_profile = TeacherProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'role', 'timezone', 'phone', 'profile_picture', 'is_verified',
            'created_at', 'last_login', 'teacher_profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_username(self, value):
        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('That username is already taken.')
        return value


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    """Public sign-up. Only student/teacher roles may be self-assigned."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Confirm password',
    )
    role = serializers.ChoiceField(
        choices=[(role, role.title()) for role in User.SELF_SIGNUP_ROLES],
        default=User.ROLE_STUDENT,
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'password', 'password2', 'role', 'timezone', 'phone',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate_email(self, value):
        value = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': "Password fields didn't match."})

        # Run Django's validators against an unsaved instance so rules like
        # "password too similar to your email" can actually fire.
        candidate = User(
            email=attrs.get('email', ''),
            username=attrs.get('username', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        validate_password(attrs['password'], user=candidate)
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)

        # A teacher is useless without the profile the scheduling app reads from.
        if user.role == User.ROLE_TEACHER:
            TeacherProfile.objects.get_or_create(user=user)

        return user


# ---------------------------------------------------------------------------
# Login / logout
# ---------------------------------------------------------------------------

class LoginSerializer(TokenObtainPairSerializer):
    """Email + password -> access/refresh pair, with the user embedded."""

    username_field = User.USERNAME_FIELD

    default_error_messages = {
        'no_active_account': 'Incorrect email or password.',
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Claims the frontend can read without a second round trip.
        token['email'] = user.email
        token['username'] = user.username
        token['role'] = user.role
        token['is_verified'] = user.is_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user, context=self.context).data
        return data


class LogoutSerializer(serializers.Serializer):
    """Blacklist a refresh token so it can no longer mint access tokens."""

    refresh = serializers.CharField(write_only=True)

    default_error_messages = {
        'bad_token': 'This refresh token is invalid or has already expired.',
    }

    def validate(self, attrs):
        try:
            self.token = RefreshToken(attrs['refresh'])
        except TokenError:
            self.fail('bad_token')
        return attrs

    def save(self, **kwargs):
        try:
            self.token.blacklist()
        except AttributeError:
            # token_blacklist app not installed - nothing to revoke.
            pass


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

class ChangePasswordSerializer(serializers.Serializer):
    """Change the password of the currently signed-in user."""

    old_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Your current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password2': "Password fields didn't match."})
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': 'The new password must differ from the current one.'
            })
        validate_password(attrs['new_password'], user=self.context['request'].user)
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Ask for a reset link. Never reveals whether the address is registered."""

    email = serializers.EmailField()

    def get_user(self):
        return User.objects.filter(
            email__iexact=User.objects.normalize_email(self.validated_data['email']),
            is_active=True,
        ).first()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Complete a reset using the uid + token from the emailed link."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})

    default_error_messages = {
        'invalid_link': 'This reset link is invalid or has expired. Please request a new one.',
    }

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password2': "Password fields didn't match."})

        user = _user_from_uid(attrs['uid'])
        if user is None or not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': self.error_messages['invalid_link']})

        validate_password(attrs['new_password'], user=user)
        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data['new_password'])
        self.user.save(update_fields=['password'])
        return self.user


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

class EmailVerificationSerializer(serializers.Serializer):
    """Confirm an email address using the uid + token from the emailed link."""

    uid = serializers.CharField()
    token = serializers.CharField()

    default_error_messages = {
        'invalid_link': 'This verification link is invalid or has expired.',
    }

    def validate(self, attrs):
        user = _user_from_uid(attrs['uid'])
        if user is None:
            raise serializers.ValidationError({'token': self.error_messages['invalid_link']})
        if user.is_verified:
            self.user = user
            self.already_verified = True
            return attrs
        if not email_verification_token.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': self.error_messages['invalid_link']})

        self.user = user
        self.already_verified = False
        return attrs

    def save(self, **kwargs):
        if not self.user.is_verified:
            self.user.is_verified = True
            self.user.save(update_fields=['is_verified'])
        return self.user


class ResendVerificationSerializer(serializers.Serializer):
    """Request a fresh verification email."""

    email = serializers.EmailField()

    def get_user(self):
        return User.objects.filter(
            email__iexact=User.objects.normalize_email(self.validated_data['email']),
            is_active=True,
            is_verified=False,
        ).first()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_from_uid(uidb64):
    """Decode a base64 uid from an email link into a User, or None.

    A malformed uid raises DjangoValidationError from the UUID primary key
    lookup, so that is caught alongside the decoding errors.
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=uid, is_active=True)
    except (TypeError, ValueError, OverflowError, DjangoValidationError, User.DoesNotExist):
        return None

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .emails import make_uid
from .models import TeacherProfile
from .tokens import email_verification_token

User = get_user_model()

STRONG_PASSWORD = 'Tilawah!2024x'
OTHER_PASSWORD = 'Tajweed!2025y'

# Throttles are keyed in the cache; a dummy cache keeps the suite from
# tripping the login/register limits across tests.
NO_THROTTLE_CACHE = {'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}


@override_settings(CACHES=NO_THROTTLE_CACHE)
class RegistrationTests(APITestCase):
    url = reverse('accounts:register')

    def payload(self, **overrides):
        data = {
            'email': 'aisha@example.com',
            'username': 'aisha',
            'password': STRONG_PASSWORD,
            'password2': STRONG_PASSWORD,
            'role': 'student',
            'timezone': 'Asia/Karachi',
        }
        data.update(overrides)
        return data

    def test_registers_a_student_and_returns_tokens(self):
        response = self.client.post(self.url, self.payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'aisha@example.com')
        self.assertEqual(response.data['user']['role'], 'student')
        self.assertFalse(response.data['user']['is_verified'])

        user = User.objects.get(email='aisha@example.com')
        self.assertTrue(user.check_password(STRONG_PASSWORD))
        self.assertEqual(user.timezone, 'Asia/Karachi')

    def test_password_is_hashed_not_stored_plaintext(self):
        self.client.post(self.url, self.payload(), format='json')
        user = User.objects.get(email='aisha@example.com')
        self.assertNotEqual(user.password, STRONG_PASSWORD)
        self.assertTrue(user.password.startswith('pbkdf2_'))

    def test_a_teacher_cannot_be_created_by_signing_up(self):
        """
        This used to be allowed and is deliberately not any more: a
        self-registered teacher would appear in the public teacher directory.
        Teachers are added in the Django admin, which is covered by
        AdminCreatesTeacherTests - including that they get a TeacherProfile.
        """
        response = self.client.post(self.url, self.payload(role='teacher'), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='aisha@example.com').exists())

    def test_cannot_self_assign_the_admin_role(self):
        response = self.client.post(self.url, self.payload(role='admin'), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', response.data)
        self.assertFalse(User.objects.filter(email='aisha@example.com').exists())

    def test_mismatched_passwords_are_rejected(self):
        response = self.client.post(
            self.url, self.payload(password2='Different!2024z'), format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password2', response.data)

    def test_weak_password_is_rejected(self):
        response = self.client.post(
            self.url, self.payload(password='12345678', password2='12345678'), format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='aisha@example.com').exists())

    def test_duplicate_email_is_rejected_case_insensitively(self):
        self.client.post(self.url, self.payload(), format='json')
        response = self.client.post(
            self.url, self.payload(email='AISHA@example.com', username='aisha2'), format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_duplicate_username_is_rejected(self):
        self.client.post(self.url, self.payload(), format='json')
        response = self.client.post(
            self.url, self.payload(email='other@example.com'), format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_sends_a_verification_email(self):
        self.client.post(self.url, self.payload(), format='json')

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/verify-email', mail.outbox[0].body)


@override_settings(CACHES=NO_THROTTLE_CACHE)
class LoginTests(APITestCase):
    url = reverse('accounts:login')

    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )

    def test_login_returns_tokens_and_user(self):
        response = self.client.post(
            self.url, {'email': 'bilal@example.com', 'password': STRONG_PASSWORD}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'bilal@example.com')

    def test_login_is_case_insensitive_on_email(self):
        response = self.client.post(
            self.url, {'email': 'BILAL@Example.com', 'password': STRONG_PASSWORD}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url, {'email': 'bilal@example.com', 'password': 'wrong-password'}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unknown_email_is_rejected(self):
        response = self.client.post(
            self.url, {'email': 'nobody@example.com', 'password': STRONG_PASSWORD}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

        response = self.client.post(
            self.url, {'email': 'bilal@example.com', 'password': STRONG_PASSWORD}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_token_carries_role_claim(self):
        response = self.client.post(
            self.url, {'email': 'bilal@example.com', 'password': STRONG_PASSWORD}, format='json'
        )

        from rest_framework_simplejwt.tokens import AccessToken
        claims = AccessToken(response.data['access'])
        self.assertEqual(claims['role'], 'student')
        self.assertEqual(claims['email'], 'bilal@example.com')


@override_settings(CACHES=NO_THROTTLE_CACHE)
class LogoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )
        login = self.client.post(
            reverse('accounts:login'),
            {'email': 'bilal@example.com', 'password': STRONG_PASSWORD},
            format='json',
        )
        self.refresh = login.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_logout_blacklists_the_refresh_token(self):
        response = self.client.post(
            reverse('accounts:logout'), {'refresh': self.refresh}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The blacklisted refresh token can no longer mint an access token.
        refreshed = self.client.post(
            reverse('accounts:token_refresh'), {'refresh': self.refresh}, format='json'
        )
        self.assertEqual(refreshed.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_rejects_a_garbage_token(self):
        response = self.client.post(
            reverse('accounts:logout'), {'refresh': 'not-a-token'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_requires_authentication(self):
        self.client.credentials()
        response = self.client.post(
            reverse('accounts:logout'), {'refresh': self.refresh}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(CACHES=NO_THROTTLE_CACHE)
class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_me_returns_the_signed_in_user(self):
        response = self.client.get(reverse('accounts:current_user'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'bilal@example.com')

    def test_me_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get(reverse('accounts:current_user'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_can_be_patched(self):
        response = self.client.patch(
            reverse('accounts:profile'),
            {'first_name': 'Bilal', 'timezone': 'Asia/Dubai'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Bilal')
        self.assertEqual(self.user.timezone, 'Asia/Dubai')

    def test_role_and_verification_cannot_be_escalated_via_profile(self):
        response = self.client.patch(
            reverse('accounts:profile'),
            {'role': 'admin', 'is_verified': True, 'email': 'hacked@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'student')
        self.assertFalse(self.user.is_verified)
        self.assertEqual(self.user.email, 'bilal@example.com')

    def test_students_cannot_reach_the_teacher_profile_endpoint(self):
        response = self.client.get(reverse('accounts:teacher_profile'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_update_their_teaching_profile(self):
        teacher = User.objects.create_user(
            email='ustadh@example.com', username='ustadh',
            password=STRONG_PASSWORD, role='teacher',
        )
        self.client.force_authenticate(teacher)

        response = self.client.patch(
            reverse('accounts:teacher_profile'),
            {'hourly_rate': '25.00', 'available_days': ['Monday', 'Wednesday'], 'bio': 'Ijazah holder'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = TeacherProfile.objects.get(user=teacher)
        self.assertEqual(str(profile.hourly_rate), '25.00')
        self.assertEqual(profile.available_days, ['Monday', 'Wednesday'])

    def test_invalid_weekday_is_rejected(self):
        teacher = User.objects.create_user(
            email='ustadh@example.com', username='ustadh',
            password=STRONG_PASSWORD, role='teacher',
        )
        self.client.force_authenticate(teacher)

        response = self.client.patch(
            reverse('accounts:teacher_profile'), {'available_days': ['Funday']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_directory_is_public(self):
        teacher = User.objects.create_user(
            email='ustadh@example.com', username='ustadh',
            password=STRONG_PASSWORD, role='teacher',
        )
        TeacherProfile.objects.create(user=teacher)
        self.client.force_authenticate(None)

        response = self.client.get(reverse('accounts:teacher_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)


@override_settings(CACHES=NO_THROTTLE_CACHE)
class ChangePasswordTests(APITestCase):
    url = reverse('accounts:change_password')

    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_password_can_be_changed(self):
        response = self.client.post(
            self.url,
            {
                'old_password': STRONG_PASSWORD,
                'new_password': OTHER_PASSWORD,
                'new_password2': OTHER_PASSWORD,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(OTHER_PASSWORD))

    def test_wrong_old_password_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                'old_password': 'wrong-password',
                'new_password': OTHER_PASSWORD,
                'new_password2': OTHER_PASSWORD,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(STRONG_PASSWORD))

    def test_reusing_the_current_password_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                'old_password': STRONG_PASSWORD,
                'new_password': STRONG_PASSWORD,
                'new_password2': STRONG_PASSWORD,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_revokes_other_sessions(self):
        login = self.client.post(
            reverse('accounts:login'),
            {'email': 'bilal@example.com', 'password': STRONG_PASSWORD},
            format='json',
        )
        old_refresh = login.data['refresh']

        self.client.force_authenticate(self.user)
        self.client.post(
            self.url,
            {
                'old_password': STRONG_PASSWORD,
                'new_password': OTHER_PASSWORD,
                'new_password2': OTHER_PASSWORD,
            },
            format='json',
        )

        refreshed = self.client.post(
            reverse('accounts:token_refresh'), {'refresh': old_refresh}, format='json'
        )
        self.assertEqual(refreshed.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(CACHES=NO_THROTTLE_CACHE)
class PasswordResetTests(APITestCase):
    request_url = reverse('accounts:password_reset')
    confirm_url = reverse('accounts:password_reset_confirm')

    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )

    def test_request_sends_an_email(self):
        response = self.client.post(self.request_url, {'email': 'bilal@example.com'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('/reset-password', mail.outbox[0].body)

    def test_unknown_email_does_not_leak_and_sends_nothing(self):
        response = self.client.post(self.request_url, {'email': 'nobody@example.com'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_can_be_completed(self):
        payload = {
            'uid': make_uid(self.user),
            'token': default_token_generator.make_token(self.user),
            'new_password': OTHER_PASSWORD,
            'new_password2': OTHER_PASSWORD,
        }
        response = self.client.post(self.confirm_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(OTHER_PASSWORD))

    def test_token_is_single_use(self):
        token = default_token_generator.make_token(self.user)
        payload = {
            'uid': make_uid(self.user),
            'token': token,
            'new_password': OTHER_PASSWORD,
            'new_password2': OTHER_PASSWORD,
        }
        self.client.post(self.confirm_url, payload, format='json')

        second = self.client.post(self.confirm_url, payload, format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tampered_token_is_rejected(self):
        payload = {
            'uid': make_uid(self.user),
            'token': 'abc-invalidtoken',
            'new_password': OTHER_PASSWORD,
            'new_password2': OTHER_PASSWORD,
        }
        response = self.client.post(self.confirm_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(STRONG_PASSWORD))

    def test_malformed_uid_is_rejected_without_a_server_error(self):
        payload = {
            'uid': 'not-base64-at-all',
            'token': 'abc-invalidtoken',
            'new_password': OTHER_PASSWORD,
            'new_password2': OTHER_PASSWORD,
        }
        response = self.client.post(self.confirm_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(CACHES=NO_THROTTLE_CACHE)
class EmailVerificationTests(APITestCase):
    url = reverse('accounts:verify_email')
    resend_url = reverse('accounts:resend_verification')

    def setUp(self):
        self.user = User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )

    def test_email_can_be_verified(self):
        payload = {
            'uid': make_uid(self.user),
            'token': email_verification_token.make_token(self.user),
        }
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_bad_token_is_rejected(self):
        response = self.client.post(
            self.url, {'uid': make_uid(self.user), 'token': 'abc-nope'}, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)

    def test_verifying_twice_is_idempotent(self):
        payload = {
            'uid': make_uid(self.user),
            'token': email_verification_token.make_token(self.user),
        }
        self.client.post(self.url, payload, format='json')
        second = self.client.post(self.url, payload, format='json')

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertIn('already', second.data['message'].lower())

    def test_resend_sends_a_fresh_link(self):
        response = self.client.post(self.resend_url, {'email': 'bilal@example.com'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_is_silent_for_already_verified_users(self):
        self.user.is_verified = True
        self.user.save(update_fields=['is_verified'])

        response = self.client.post(self.resend_url, {'email': 'bilal@example.com'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)


class ThrottlingTests(APITestCase):
    def test_repeated_failed_logins_are_throttled(self):
        User.objects.create_user(
            email='bilal@example.com', username='bilal', password=STRONG_PASSWORD
        )
        url = reverse('accounts:login')
        payload = {'email': 'bilal@example.com', 'password': 'wrong-password'}

        codes = [self.client.post(url, payload, format='json').status_code for _ in range(12)]
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, codes)


class UserManagerTests(APITestCase):
    def test_create_superuser_gets_the_admin_role(self):
        admin = User.objects.create_superuser(
            email='admin@example.com', username='admin', password=STRONG_PASSWORD
        )

        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_verified)

    def test_email_is_normalised(self):
        user = User.objects.create_user(
            email='Bilal@EXAMPLE.COM', username='bilal', password=STRONG_PASSWORD
        )
        self.assertEqual(user.email, 'Bilal@example.com')

    def test_email_is_required(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', username='x', password=STRONG_PASSWORD)


# ---------------------------------------------------------------------------
# Public sign-up is closed, and emails are templated
# ---------------------------------------------------------------------------

@override_settings(CACHES=NO_THROTTLE_CACHE)
class SelfSignupTests(APITestCase):
    """
    Teachers are appointed, not self-declared. Anyone who could register as a
    teacher would appear in the public teacher directory.
    """

    url = reverse('accounts:register')

    def payload(self, **overrides):
        data = {
            'email': 'someone@example.com',
            'username': 'someone',
            'password': STRONG_PASSWORD,
            'password2': STRONG_PASSWORD,
        }
        data.update(overrides)
        return data

    def test_the_teacher_role_is_refused(self):
        response = self.client.post(self.url, self.payload(role='teacher'), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', response.data)
        self.assertFalse(User.objects.filter(email='someone@example.com').exists())

    def test_the_admin_role_is_still_refused(self):
        response = self.client.post(self.url, self.payload(role='admin'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_student_can_still_be_created_through_the_api(self):
        # The application flow relies on this path, so it must keep working.
        response = self.client.post(self.url, self.payload(role='student'), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class AccountCreatedEmailTests(TestCase):
    """The email an admin-created account receives."""

    def setUp(self):
        self.teacher = User.objects.create_user(
            email='ustadh@example.com', username='ustadh',
            password=STRONG_PASSWORD, role='teacher', first_name='Bilal',
        )

    def test_it_sends_both_a_text_and_an_html_part(self):
        from .emails import send_account_created

        self.assertTrue(send_account_created(self.teacher))
        self.assertEqual(len(mail.outbox), 1)

        message = mail.outbox[0]
        self.assertEqual(message.to, ['ustadh@example.com'])
        # Plain text is the body; HTML rides along as an alternative.
        self.assertEqual(len(message.alternatives), 1)
        self.assertEqual(message.alternatives[0][1], 'text/html')

    def test_it_says_create_not_reset(self):
        from .emails import send_account_created

        send_account_created(self.teacher)
        message = mail.outbox[0]
        html = message.alternatives[0][0]

        self.assertIn('Create my password', html)
        self.assertNotIn('Reset your password', html)

    def test_the_link_marks_the_account_as_new(self):
        from .emails import send_account_created

        send_account_created(self.teacher)
        # `new=1` is what makes the page say "Create your password".
        self.assertIn('new=1', mail.outbox[0].body)

    def test_the_raw_link_appears_in_both_parts(self):
        # A client that blocks HTML, or a person who will not click a button,
        # must still be able to reach the link.
        from .emails import send_account_created

        send_account_created(self.teacher)
        message = mail.outbox[0]
        self.assertIn('/reset-password', message.body)
        self.assertIn('/reset-password', message.alternatives[0][0])

    def test_the_plain_text_link_is_not_html_escaped(self):
        """
        Django escapes templates by default. In the text part that turns the
        "&" between query parameters into "&amp;", and the link is dead for
        anyone who copies it out.
        """
        from .emails import send_account_created

        mail.outbox.clear()
        send_account_created(self.teacher)
        body = mail.outbox[0].body

        self.assertNotIn('&amp;', body)
        self.assertIn('&token=', body)
        self.assertIn('&new=1', body)

    def test_a_password_reset_is_not_marked_as_new(self):
        from .emails import send_password_reset

        send_password_reset(self.teacher)
        self.assertNotIn('new=1', mail.outbox[0].body)


class AdminCreatesTeacherTests(TestCase):
    """Adding a user in the Django admin emails them a way in."""

    def test_saving_a_new_teacher_sends_the_email_and_makes_a_profile(self):
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory
        from django.contrib.messages.storage.fallback import FallbackStorage

        from .admin import UserAdmin
        from .models import TeacherProfile

        request = RequestFactory().post('/admin/accounts/user/add/')
        request.user = User.objects.create_superuser(
            email='admin@example.com', username='admin', password=STRONG_PASSWORD,
        )
        request.session = {}
        request._messages = FallbackStorage(request)

        teacher = User(email='new@example.com', username='newteacher', role='teacher')
        teacher.set_password(STRONG_PASSWORD)

        mail.outbox.clear()
        UserAdmin(User, AdminSite()).save_model(request, teacher, form=None, change=False)

        self.assertTrue(TeacherProfile.objects.filter(user=teacher).exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('new=1', mail.outbox[0].body)

    def test_editing_an_existing_user_sends_nothing(self):
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory
        from django.contrib.messages.storage.fallback import FallbackStorage

        from .admin import UserAdmin

        user = User.objects.create_user(
            email='existing@example.com', username='existing', password=STRONG_PASSWORD,
        )
        request = RequestFactory().post('/admin/accounts/user/1/change/')
        request.user = User.objects.create_superuser(
            email='admin2@example.com', username='admin2', password=STRONG_PASSWORD,
        )
        request.session = {}
        request._messages = FallbackStorage(request)

        mail.outbox.clear()
        UserAdmin(User, AdminSite()).save_model(request, user, form=None, change=True)

        self.assertEqual(len(mail.outbox), 0)

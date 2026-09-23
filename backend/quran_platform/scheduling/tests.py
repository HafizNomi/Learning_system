"""
Tests for class scheduling.

The permission case is the one that mattered: CreateSessionView used
IsAdminUser, which checks Django's `is_staff` flag rather than our own
`role == 'admin'`, so real platform admins were refused.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from applications.models import Application
from courses.models import Course
from scheduling.models import ClassSession

User = get_user_model()


class SchedulingTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course = Course.objects.create(
            title='Quran Recitation', description='d', category='quran',
            price_per_month=Decimal('30.00'),
        )
        self.admin = User.objects.create_user(
            email='admin@example.com', username='admin',
            password='Passw0rd!x', role='admin',
        )
        self.teacher = User.objects.create_user(
            email='teacher@example.com', username='teacher',
            password='Passw0rd!x', role='teacher',
        )
        self.student = User.objects.create_user(
            email='student@example.com', username='student',
            password='Passw0rd!x', role='student',
        )
        self.application = Application.objects.create(
            student_name='Bilal', student_age=11, student_gender='male',
            parent_name='Parent', parent_email='student@example.com',
            parent_phone='+920000000', course=self.course,
            student=self.student, assigned_teacher=self.teacher, status='active',
        )
        self.start = (timezone.now() + timedelta(days=1)).replace(microsecond=0)

    def _payload(self, start=None):
        return {
            'application_id': str(self.application.id),
            'start_time': (start or self.start).isoformat().replace('+00:00', 'Z'),
            'duration': 45,
        }


class CreateSessionPermissionTests(SchedulingTestBase):
    url = '/api/scheduling/create/'

    def test_role_admin_can_create_a_session(self):
        """
        Regression: with IsAdminUser this returned 403 for a role='admin'
        user, because that permission only looks at `is_staff`.
        """
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(ClassSession.objects.count(), 1)

        session = ClassSession.objects.get()
        self.assertEqual(session.teacher, self.teacher)
        self.assertEqual(session.student, self.student)
        self.assertEqual(session.end_time - session.start_time, timedelta(minutes=45))

    def test_student_cannot_create_a_session(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_create_a_session(self):
        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(response.status_code, 401)


class CreateSessionValidationTests(SchedulingTestBase):
    url = '/api/scheduling/create/'

    def test_double_booking_a_teacher_is_refused(self):
        self.client.force_authenticate(user=self.admin)

        first = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(first.status_code, 201)

        # 15 minutes into the existing 45-minute class.
        overlap = self.start + timedelta(minutes=15)
        second = self.client.post(self.url, self._payload(overlap), format='json')

        self.assertEqual(second.status_code, 400)
        self.assertIn('already booked', second.data['error'])
        self.assertEqual(ClassSession.objects.count(), 1)

    def test_application_without_a_teacher_is_refused(self):
        self.application.assigned_teacher = None
        self.application.save(update_fields=['assigned_teacher'])

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('No teacher assigned', response.data['error'])

    def test_bad_date_format_is_refused(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {'application_id': str(self.application.id), 'start_time': 'tomorrow'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class UpcomingSessionsTests(SchedulingTestBase):
    url = '/api/scheduling/upcoming/'

    def setUp(self):
        super().setUp()
        self.session = ClassSession.objects.create(
            student=self.student, teacher=self.teacher, course=self.course,
            application=self.application,
            start_time=self.start, end_time=self.start + timedelta(minutes=45),
        )

    def test_student_sees_their_own_upcoming_class(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_teacher_sees_the_class_they_teach(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 1)

    def test_an_unrelated_student_sees_nothing(self):
        outsider = User.objects.create_user(
            email='outsider@example.com', username='outsider',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 0)

    def test_past_sessions_are_not_upcoming(self):
        self.session.start_time = timezone.now() - timedelta(days=2)
        self.session.end_time = self.session.start_time + timedelta(minutes=45)
        self.session.save()

        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 0)


class GenerateSessionsTests(SchedulingTestBase):
    """The bulk generator - a month of classes in one call."""

    url = '/api/scheduling/generate/'

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.admin)
        self.monday = (timezone.now() + timedelta(days=(7 - timezone.now().weekday()))).date()

    def _payload(self, **overrides):
        payload = {
            'application_id': str(self.application.id),
            'start_date': self.monday.isoformat(),
            'weeks': 2,
            'time_of_day': '17:00',
            'timezone': 'Asia/Karachi',
        }
        payload.update(overrides)
        return payload

    def test_generates_three_classes_a_week_from_the_application_preference(self):
        # The application defaults to mon_wed_fri.
        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['created_count'], 6)   # 3 a week x 2 weeks
        self.assertEqual(ClassSession.objects.count(), 6)

        for session in ClassSession.objects.all():
            self.assertIn(session.start_time.weekday(), [0, 2, 4])
            self.assertEqual(session.teacher, self.teacher)
            self.assertEqual(session.duration_minutes, self.course.duration_minutes)

    def test_time_is_interpreted_in_the_given_timezone(self):
        """17:00 in Karachi is 12:00 UTC - storing 17:00 UTC would be 5 hours out."""
        self.client.post(self.url, self._payload(weeks=1), format='json')

        session = ClassSession.objects.order_by('start_time').first()
        self.assertEqual(session.start_time.hour, 12)

    def test_explicit_weekdays_override_the_preference(self):
        response = self.client.post(
            self.url, self._payload(weeks=1, weekdays=[6]), format='json',
        )
        self.assertEqual(response.data['created_count'], 1)
        self.assertEqual(ClassSession.objects.get().start_time.weekday(), 6)

    def test_clashes_are_skipped_and_reported_not_silently_dropped(self):
        self.client.post(self.url, self._payload(weeks=1), format='json')
        created_first = ClassSession.objects.count()

        # Same slots again - every one should clash with the run above.
        second = self.client.post(self.url, self._payload(weeks=1), format='json')

        self.assertEqual(second.data['created_count'], 0)
        self.assertEqual(second.data['skipped_count'], 3)
        self.assertIn('teacher already booked', second.data['skipped'][0]['reason'])
        self.assertEqual(ClassSession.objects.count(), created_first)

    def test_past_dates_are_skipped(self):
        past = (timezone.now() - timedelta(days=14)).date()
        response = self.client.post(
            self.url, self._payload(start_date=past.isoformat(), weeks=1), format='json',
        )
        self.assertEqual(response.data['created_count'], 0)
        self.assertGreater(response.data['skipped_count'], 0)

    def test_unknown_timezone_is_refused(self):
        response = self.client.post(
            self.url, self._payload(timezone='Mars/Olympus'), format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('timezone', response.data)

    def test_application_without_a_student_account_is_refused(self):
        self.application.student = None
        self.application.save(update_fields=['student'])

        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('no student account', response.data['error'])

    def test_a_teacher_cannot_generate_sessions(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(response.status_code, 403)


class JoinWindowTests(SchedulingTestBase):
    """The Join button must only be live around the actual class time."""

    def _session(self, starts_in_minutes, link='https://meet.google.com/abc-defg-hij'):
        start = timezone.now() + timedelta(minutes=starts_in_minutes)
        return ClassSession.objects.create(
            student=self.student, teacher=self.teacher, course=self.course,
            application=self.application, start_time=start,
            end_time=start + timedelta(minutes=45), meeting_link=link,
        )

    def test_not_joinable_long_before_the_class(self):
        self.assertFalse(self._session(60).is_joinable)

    def test_joinable_ten_minutes_before(self):
        self.assertTrue(self._session(5).is_joinable)

    def test_joinable_during_the_class(self):
        self.assertTrue(self._session(-20).is_joinable)

    def test_not_joinable_long_after_it_ended(self):
        self.assertFalse(self._session(-120).is_joinable)

    def test_not_joinable_without_a_link(self):
        self.assertFalse(self._session(5, link='').is_joinable)

    def test_not_joinable_once_cancelled(self):
        session = self._session(5)
        session.status = 'cancelled'
        session.save(update_fields=['status'])
        self.assertFalse(session.is_joinable)


class UpdateSessionTests(SchedulingTestBase):
    def setUp(self):
        super().setUp()
        self.session = ClassSession.objects.create(
            student=self.student, teacher=self.teacher, course=self.course,
            application=self.application, start_time=self.start,
            end_time=self.start + timedelta(minutes=45),
        )
        self.url = f'/api/scheduling/{self.session.id}/update/'

    def test_teacher_can_attach_a_google_meet_link(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch(
            self.url, {'meeting_link': 'meet.google.com/abc-defg-hij'}, format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.session.refresh_from_db()
        # A pasted link without a scheme is repaired rather than rejected.
        self.assertEqual(self.session.meeting_link, 'https://meet.google.com/abc-defg-hij')

    def test_a_link_to_somewhere_else_is_refused(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch(
            self.url, {'meeting_link': 'https://evil.example.com/room'}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('meeting_link', response.data)

    def test_student_cannot_update_the_session(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(self.url, {'teacher_notes': 'hi'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_cancelling_requires_a_reason(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch(self.url, {'status': 'cancelled'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('cancellation_reason', response.data)

    def test_cancelling_with_a_reason_works(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch(
            self.url,
            {'status': 'cancelled', 'cancellation_reason': 'Teacher unwell'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'cancelled')

    def test_rescheduling_onto_a_busy_slot_is_refused(self):
        other_start = self.start + timedelta(hours=3)
        ClassSession.objects.create(
            student=self.student, teacher=self.teacher, course=self.course,
            application=self.application, start_time=other_start,
            end_time=other_start + timedelta(minutes=45),
        )

        self.client.force_authenticate(user=self.teacher)
        response = self.client.patch(
            self.url,
            {'start_time': other_start.isoformat().replace('+00:00', 'Z')},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('already booked', response.data['error'])

    def test_rescheduling_keeps_the_original_duration(self):
        self.client.force_authenticate(user=self.teacher)
        new_start = self.start + timedelta(days=1)
        self.client.patch(
            self.url,
            {'start_time': new_start.isoformat().replace('+00:00', 'Z')},
            format='json',
        )
        self.session.refresh_from_db()
        self.assertEqual(self.session.duration_minutes, 45)

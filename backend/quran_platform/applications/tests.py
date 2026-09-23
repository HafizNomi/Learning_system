"""
Tests for the application flow: submit anonymously, admin approves, a student
account is created and linked.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from applications.models import Application
from courses.models import Course

User = get_user_model()


class ApplicationTestBase(TestCase):
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

    def _payload(self, **overrides):
        payload = {
            'student_name': 'Ali', 'student_age': 10, 'student_gender': 'male',
            'parent_name': 'Sara', 'parent_email': 'sara@example.com',
            'parent_phone': '+923000000', 'course': str(self.course.id),
            'preferred_days': 'mon_wed_fri', 'preferred_time': 'evening',
            'preferred_timezone': 'Asia/Karachi', 'knows_arabic': False,
        }
        payload.update(overrides)
        return payload


class SubmitApplicationTests(ApplicationTestBase):
    url = '/api/applications/apply/'

    def test_anonymous_visitor_can_apply(self):
        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn('application_id', response.data)
        self.assertEqual(response.data['status'], 'pending')
        # The full record comes back so the SPA can store a local receipt.
        self.assertEqual(response.data['application']['course_details']['title'],
                         'Quran Recitation')

    def test_age_outside_4_to_18_is_refused(self):
        for age in (3, 19):
            response = self.client.post(self.url, self._payload(student_age=age), format='json')
            self.assertEqual(response.status_code, 400)
            self.assertIn('student_age', response.data)

    def test_cannot_apply_to_an_inactive_course(self):
        self.course.is_active = False
        self.course.save(update_fields=['is_active'])

        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('course', response.data)

    def test_signed_in_student_is_linked_immediately(self):
        student = User.objects.create_user(
            email='sara@example.com', username='sara',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=student)

        self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(Application.objects.get().student, student)

    def test_status_cannot_be_set_by_the_applicant(self):
        response = self.client.post(
            self.url, self._payload(status='approved'), format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Application.objects.get().status, 'pending')


class ApplicationVisibilityTests(ApplicationTestBase):
    def setUp(self):
        super().setUp()
        self.application = Application.objects.create(
            **{k: v for k, v in self._payload().items() if k != 'course'},
            course=self.course,
        )

    def test_anonymous_cannot_read_an_application(self):
        response = self.client.get(f'/api/applications/{self.application.id}/')
        self.assertEqual(response.status_code, 401)

    def test_applicant_sees_it_by_matching_email(self):
        applicant = User.objects.create_user(
            email='sara@example.com', username='sara',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=applicant)

        response = self.client.get(f'/api/applications/{self.application.id}/')
        self.assertEqual(response.status_code, 200)

        mine = self.client.get('/api/applications/my/')
        self.assertEqual(mine.data['count'], 1)

    def test_unrelated_student_cannot_read_it(self):
        outsider = User.objects.create_user(
            email='outsider@example.com', username='outsider',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.get(f'/api/applications/{self.application.id}/')
        self.assertEqual(response.status_code, 404)

    def test_teacher_sees_only_applications_assigned_to_them(self):
        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get('/api/applications/my/').data['count'], 0)

        self.application.assigned_teacher = self.teacher
        self.application.save(update_fields=['assigned_teacher'])

        self.assertEqual(self.client.get('/api/applications/my/').data['count'], 1)

    def test_only_admins_can_list_every_application(self):
        student = User.objects.create_user(
            email='s@example.com', username='s', password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=student)
        self.assertEqual(self.client.get('/api/applications/').status_code, 403)

        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.get('/api/applications/').status_code, 200)


class ApproveApplicationTests(ApplicationTestBase):
    def setUp(self):
        super().setUp()
        self.application = Application.objects.create(
            **{k: v for k, v in self._payload().items() if k != 'course'},
            course=self.course,
        )
        self.url = f'/api/applications/{self.application.id}/update-status/'
        self.client.force_authenticate(user=self.admin)

    def test_approving_without_a_teacher_is_refused(self):
        response = self.client.patch(self.url, {'status': 'approved'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('assigned_teacher', response.data)

    def test_approving_creates_and_links_a_student_account(self):
        response = self.client.patch(
            self.url,
            {'status': 'approved', 'assigned_teacher': str(self.teacher.id),
             'assigned_time_slot': 'Monday 5:00 PM'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, 'approved')
        self.assertEqual(self.application.assigned_teacher, self.teacher)

        created = User.objects.get(email='sara@example.com')
        self.assertEqual(created.role, 'student')
        self.assertEqual(self.application.student, created)
        self.assertEqual(created.timezone, 'Asia/Karachi')

    def test_approving_twice_does_not_create_a_second_account(self):
        body = {'status': 'approved', 'assigned_teacher': str(self.teacher.id)}
        self.client.patch(self.url, body, format='json')
        self.client.patch(self.url, {'status': 'active'}, format='json')

        self.assertEqual(User.objects.filter(email='sara@example.com').count(), 1)

    def test_patching_status_alone_keeps_the_existing_teacher(self):
        self.client.patch(
            self.url,
            {'status': 'approved', 'assigned_teacher': str(self.teacher.id)},
            format='json',
        )
        response = self.client.patch(self.url, {'status': 'approved'}, format='json')

        self.assertEqual(response.status_code, 200, response.data)

    def test_a_student_cannot_approve_their_own_application(self):
        student = User.objects.create_user(
            email='sara@example.com', username='sara',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=student)
        response = self.client.patch(
            self.url,
            {'status': 'approved', 'assigned_teacher': str(self.teacher.id)},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

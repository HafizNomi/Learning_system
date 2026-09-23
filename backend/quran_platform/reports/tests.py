"""
Tests for monthly progress reports.

The permission test is a regression guard: reports/views.py referenced
`status.HTTP_403_FORBIDDEN` without importing `status`, so a student hitting
this endpoint got a 500 NameError instead of a clean 403.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import Course
from reports.models import MonthlyReport

User = get_user_model()


class ReportTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.course = Course.objects.create(
            title='Hifz', description='Memorisation', category='quran_memorization',
            price_per_month=Decimal('60.00'),
        )
        self.teacher = User.objects.create_user(
            email='teacher@example.com', username='teacher',
            password='Passw0rd!x', role='teacher',
        )
        self.student = User.objects.create_user(
            email='student@example.com', username='student',
            password='Passw0rd!x', role='student',
        )


class ReportCreatePermissionTests(ReportTestBase):
    url = '/api/reports/create/'

    def _payload(self):
        return {
            'student_id': str(self.student.id),
            'course_id': str(self.course.id),
            'month': 9,
            'year': 2026,
            'teacher_comments': 'Steady progress this month.',
        }

    def test_student_gets_a_clean_403_not_a_crash(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(response.status_code, 403)
        self.assertIn('error', response.data)

    def test_teacher_can_create_a_report(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 200, response.data)
        report = MonthlyReport.objects.get()
        self.assertEqual(report.teacher, self.teacher)
        self.assertEqual(report.teacher_comments, 'Steady progress this month.')

    def test_creating_twice_updates_rather_than_duplicates(self):
        self.client.force_authenticate(user=self.teacher)

        self.client.post(self.url, self._payload(), format='json')
        second = self._payload()
        second['teacher_comments'] = 'Revised comment.'
        self.client.post(self.url, second, format='json')

        self.assertEqual(MonthlyReport.objects.count(), 1)
        self.assertEqual(MonthlyReport.objects.get().teacher_comments, 'Revised comment.')

    def test_finalising_makes_the_report_visible_to_the_parent(self):
        """
        Regression: ReportCreateView copies a whitelist of fields from the
        request, and `is_finalized` was missing from it - so a report could
        never leave draft and no parent ever saw one.
        """
        self.client.force_authenticate(user=self.teacher)

        draft = {**self._payload(), 'is_finalized': False}
        self.client.post(self.url, draft, format='json')
        self.assertFalse(MonthlyReport.objects.get().is_finalized)

        self.client.post(self.url, {**draft, 'is_finalized': True}, format='json')

        report = MonthlyReport.objects.get()
        self.assertTrue(report.is_finalized)
        # Finalising must edit the draft, not leave a second row behind.
        self.assertEqual(MonthlyReport.objects.count(), 1)

        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get('/api/reports/').data['count'], 1)

    def test_attendance_figures_come_from_the_register_not_the_request(self):
        """A teacher cannot type in an attendance percentage."""
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(
            self.url,
            {**self._payload(), 'total_classes': 99, 'attendance_percentage': '100.00'},
            format='json',
        )
        self.assertEqual(response.data['total_classes'], 0)
        self.assertEqual(Decimal(response.data['attendance_percentage']), Decimal('0.00'))

    def test_attendance_percentage_is_zero_with_no_classes(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(Decimal(response.data['attendance_percentage']), Decimal('0.00'))


class ReportVisibilityTests(ReportTestBase):
    def setUp(self):
        super().setUp()
        self.report = MonthlyReport.objects.create(
            student=self.student, course=self.course, teacher=self.teacher,
            month=9, year=2026, teacher_comments='Good work', is_finalized=True,
        )

    def test_student_sees_their_own_finalised_report(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/reports/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['period'], 'September 2026')

    def test_a_draft_report_is_hidden_from_the_parent(self):
        """A half-written report is not something to send home."""
        self.report.is_finalized = False
        self.report.save(update_fields=['is_finalized'])

        self.client.force_authenticate(user=self.student)
        self.assertEqual(self.client.get('/api/reports/').data['count'], 0)
        self.assertEqual(
            self.client.get(f'/api/reports/{self.report.id}/').status_code, 404,
        )

    def test_the_teacher_still_sees_their_own_draft(self):
        self.report.is_finalized = False
        self.report.save(update_fields=['is_finalized'])

        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(self.client.get('/api/reports/').data['count'], 1)

    def test_unrelated_student_sees_nothing(self):
        outsider = User.objects.create_user(
            email='outsider@example.com', username='outsider',
            password='Passw0rd!x', role='student',
        )
        self.client.force_authenticate(user=outsider)
        self.assertEqual(self.client.get('/api/reports/').data['count'], 0)

    def test_filter_by_month_and_year(self):
        self.client.force_authenticate(user=self.teacher)
        self.assertEqual(
            self.client.get('/api/reports/?month=9&year=2026').data['count'], 1,
        )
        self.assertEqual(
            self.client.get('/api/reports/?month=8&year=2026').data['count'], 0,
        )

    def test_anonymous_is_refused(self):
        self.assertEqual(self.client.get('/api/reports/').status_code, 401)

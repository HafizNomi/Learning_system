"""Tests for the course catalogue."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import Course

User = get_user_model()


class CourseCatalogueTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active = Course.objects.create(
            title='Quran for Beginners', description='Start here',
            category='quran', level='beginner', price_per_month=Decimal('30.00'),
        )
        self.hidden = Course.objects.create(
            title='Retired Course', description='Old', category='quran',
            level='beginner', is_active=False,
        )

    def test_anyone_can_list_courses(self):
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_inactive_courses_are_hidden(self):
        titles = [c['title'] for c in self.client.get('/api/courses/').data['results']]
        self.assertNotIn('Retired Course', titles)

    def test_inactive_course_detail_is_404(self):
        response = self.client.get(f'/api/courses/{self.hidden.id}/')
        self.assertEqual(response.status_code, 404)

    def test_filter_by_category(self):
        Course.objects.create(
            title='Intro to AI', description='Tech', category='ai', level='beginner',
        )
        response = self.client.get('/api/courses/?category=ai')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], 'Intro to AI')

    def test_search_by_title(self):
        response = self.client.get('/api/courses/?search=Beginners')
        self.assertEqual(response.data['count'], 1)


class CourseCreatePermissionTests(TestCase):
    url = '/api/courses/create/'

    def setUp(self):
        self.client = APIClient()
        self.payload = {
            'title': 'Blockchain Basics',
            'description': 'How a chain of blocks works',
            'category': 'blockchain',
            'level': 'beginner',
            'price_per_month': '55.00',
        }

    def test_role_admin_can_create_a_course(self):
        """
        Regression: IsAdminUser checks `is_staff`, so a role='admin' user was
        refused even though they run the platform.
        """
        admin = User.objects.create_user(
            email='admin@example.com', username='admin',
            password='Passw0rd!x', role='admin',
        )
        self.client.force_authenticate(user=admin)

        response = self.client.post(self.url, self.payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Course.objects.filter(title='Blockchain Basics').exists())

    def test_teacher_cannot_create_a_course(self):
        teacher = User.objects.create_user(
            email='teacher@example.com', username='teacher',
            password='Passw0rd!x', role='teacher',
        )
        self.client.force_authenticate(user=teacher)
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_create_a_course(self):
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 401)

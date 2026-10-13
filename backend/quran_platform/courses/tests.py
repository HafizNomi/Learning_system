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


# ---------------------------------------------------------------------------
# Recorded lessons on YouTube
# ---------------------------------------------------------------------------

VIDEO = 'dQw4w9WgXcQ'


class YouTubeUrlTests(TestCase):
    """Staff paste whatever YouTube gave them; all of it has to work."""

    def test_every_common_link_shape_yields_the_id(self):
        from courses.youtube import extract_video_id

        for url in [
            f'https://www.youtube.com/watch?v={VIDEO}',
            f'https://youtube.com/watch?v={VIDEO}',
            f'https://m.youtube.com/watch?v={VIDEO}',
            f'https://youtu.be/{VIDEO}',
            f'https://www.youtube.com/embed/{VIDEO}',
            f'https://www.youtube.com/shorts/{VIDEO}',
            f'https://www.youtube.com/live/{VIDEO}',
            f'https://www.youtube-nocookie.com/embed/{VIDEO}',
            # Extra parameters are normal on a share link.
            f'https://www.youtube.com/watch?v={VIDEO}&t=90s',
            f'https://youtu.be/{VIDEO}?t=90',
            f'https://www.youtube.com/watch?list=PL123&v={VIDEO}',
            # Pasted without the scheme.
            f'youtu.be/{VIDEO}',
            f'  https://youtu.be/{VIDEO}  ',
        ]:
            with self.subTest(url=url):
                self.assertEqual(extract_video_id(url), VIDEO)

    def test_links_that_are_not_youtube_videos_are_rejected(self):
        from courses.youtube import extract_video_id

        for url in [
            '', None, 'not a url',
            'https://vimeo.com/123456789',
            'https://example.com/watch?v=' + VIDEO,       # right shape, wrong host
            'https://www.youtube.com/watch?v=tooshort',   # id is not 11 chars
            'https://www.youtube.com/channel/UC123456789',
            'https://www.youtube.com/',
        ]:
            with self.subTest(url=url):
                self.assertIsNone(extract_video_id(url))

    def test_the_embed_url_uses_the_no_cookie_domain(self):
        from courses.youtube import embed_url

        self.assertIn('youtube-nocookie.com', embed_url(VIDEO))
        self.assertIn(VIDEO, embed_url(VIDEO))

    def test_the_model_rejects_a_bad_link(self):
        from django.core.exceptions import ValidationError
        from courses.models import CourseLesson

        course = Course.objects.create(
            title='Tech', description='x', category='ai', level='beginner',
        )
        lesson = CourseLesson(course=course, title='Week 1', youtube_url='https://vimeo.com/1')

        with self.assertRaises(ValidationError):
            lesson.full_clean()


class LessonAccessTests(TestCase):
    """
    A locked lesson must never hand out its video link - that link is the
    product, and an unlisted YouTube video is only private while the URL is.
    """

    def setUp(self):
        from courses.models import CourseLesson

        self.client = APIClient()
        self.course = Course.objects.create(
            title='Blockchain', description='x', category='blockchain', level='beginner',
        )
        self.paid = CourseLesson.objects.create(
            course=self.course, title='Week 2', order=2,
            youtube_url=f'https://youtu.be/{VIDEO}',
        )
        self.preview = CourseLesson.objects.create(
            course=self.course, title='Week 1', order=1, is_preview=True,
            youtube_url=f'https://youtu.be/{VIDEO}',
        )
        self.hidden = CourseLesson.objects.create(
            course=self.course, title='Draft', order=3, is_published=False,
            youtube_url=f'https://youtu.be/{VIDEO}',
        )
        self.url = f'/api/courses/{self.course.id}/'

    def lessons_for(self, user=None):
        if user:
            self.client.force_authenticate(user)
        else:
            self.client.force_authenticate(None)
        return {l['title']: l for l in self.client.get(self.url).data['lessons']}

    def enrolled_student(self, status='active'):
        from applications.models import Application

        student = User.objects.create_user(
            email='f@example.com', username='f', password='Tilawah!2024x', role='student',
        )
        Application.objects.create(
            student_name='F', student_age=10, student_gender='female',
            parent_name='P', parent_email='p@example.com', parent_phone='+100',
            course=self.course, student=student, status=status,
        )
        return student

    def test_unpublished_lessons_are_not_listed_at_all(self):
        self.assertNotIn('Draft', self.lessons_for())

    def test_a_visitor_can_watch_the_preview_lesson(self):
        preview = self.lessons_for()['Week 1']
        self.assertFalse(preview['is_locked'])
        self.assertEqual(preview['video_id'], VIDEO)
        self.assertIn('youtube-nocookie', preview['embed_url'])

    def test_a_visitor_cannot_get_the_link_for_a_paid_lesson(self):
        paid = self.lessons_for()['Week 2']
        self.assertTrue(paid['is_locked'])
        self.assertIsNone(paid['video_id'])
        self.assertIsNone(paid['embed_url'])
        self.assertIsNone(paid['watch_url'])

    def test_the_lesson_is_still_advertised_while_locked(self):
        paid = self.lessons_for()['Week 2']
        self.assertEqual(paid['title'], 'Week 2')
        self.assertIsNotNone(paid['thumbnail_url'])

    def test_signing_in_alone_does_not_unlock_a_course(self):
        outsider = User.objects.create_user(
            email='o@example.com', username='o', password='Tilawah!2024x', role='student',
        )
        self.assertTrue(self.lessons_for(outsider)['Week 2']['is_locked'])

    def test_an_enrolled_student_can_watch(self):
        paid = self.lessons_for(self.enrolled_student())['Week 2']
        self.assertFalse(paid['is_locked'])
        self.assertEqual(paid['video_id'], VIDEO)

    def test_a_pending_application_does_not_unlock_anything(self):
        self.assertTrue(self.lessons_for(self.enrolled_student('pending'))['Week 2']['is_locked'])

    def test_a_withdrawn_student_loses_access(self):
        self.assertTrue(self.lessons_for(self.enrolled_student('withdrawn'))['Week 2']['is_locked'])

    def test_teachers_and_admins_can_watch_everything(self):
        for role in ['teacher', 'admin']:
            with self.subTest(role=role):
                staff = User.objects.create_user(
                    email=f'{role}@example.com', username=role,
                    password='Tilawah!2024x', role=role,
                )
                self.assertFalse(self.lessons_for(staff)['Week 2']['is_locked'])

    def test_the_raw_youtube_url_is_never_serialised(self):
        # Belt and braces: even for an allowed viewer, the write-only field
        # must not appear, or a locked lesson could leak through it later.
        self.client.force_authenticate(None)
        for lesson in self.client.get(self.url).data['lessons']:
            self.assertNotIn('youtube_url', lesson)

    def test_lessons_come_back_in_order(self):
        titles = [l['title'] for l in self.client.get(self.url).data['lessons']]
        self.assertEqual(titles, ['Week 1', 'Week 2'])

    def test_the_course_list_reports_how_many_lessons_there_are(self):
        self.client.force_authenticate(None)
        row = next(
            c for c in self.client.get('/api/courses/').data['results']
            if c['id'] == str(self.course.id)
        )
        self.assertEqual(row['lesson_count'], 2)  # the draft is not counted


class CourseListOrderingTests(TestCase):
    """
    Regression: annotating the course list with a lesson count drops the
    model's Meta.ordering, and DRF then paginates an unordered queryset -
    which can show the same course twice and omit another entirely.
    """

    def test_the_paginated_course_list_stays_ordered(self):
        from courses.views import CourseListView

        self.assertTrue(
            CourseListView.queryset.ordered,
            'The course list queryset lost its ordering; pagination will repeat rows.',
        )

from django.db.models import Count, Prefetch, Q
from rest_framework import filters, generics, permissions
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Course, CourseLesson
from .serializers import CourseDetailSerializer, CourseLessonSerializer, CourseSerializer
from accounts.permissions import IsAdmin

# Counting only the lessons students can actually see, in the same query that
# fetches the courses.
PUBLISHED_LESSONS = Count('lessons', filter=Q(lessons__is_published=True))

# annotate() drops the model's Meta.ordering, and an unordered queryset makes
# paginated pages repeat or skip rows. Re-apply it explicitly.
COURSE_ORDER = ['category', 'title']


class CourseListView(generics.ListAPIView):
    """List all available courses"""

    queryset = Course.objects.filter(is_active=True).annotate(
        published_lesson_count=PUBLISHED_LESSONS
    ).order_by(*COURSE_ORDER)
    serializer_class = CourseSerializer
    permission_classes = [permissions.AllowAny]

    # Add filtering and searching
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'level']
    search_fields = ['title', 'description']


class CourseDetailView(generics.RetrieveAPIView):
    """Get details of a specific course, including its recorded lessons"""

    queryset = Course.objects.filter(is_active=True).annotate(
        published_lesson_count=PUBLISHED_LESSONS
    ).order_by(*COURSE_ORDER).prefetch_related(
        Prefetch('lessons', queryset=CourseLesson.objects.filter(is_published=True))
    )
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'


class CourseCreateView(generics.CreateAPIView):
    """Admin only: Create a new course"""

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    # IsAdminUser checks Django's `is_staff`; our admins are `role='admin'`.
    permission_classes = [IsAdmin]


class CourseLessonListView(generics.ListAPIView):
    """
    The recorded lessons for one course.

    Same data as the nested list on the course detail page, as its own endpoint
    so a lesson player can reload without refetching the whole course.
    """

    serializer_class = CourseLessonSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            CourseLesson.objects
            .filter(course_id=self.kwargs['course_id'], is_published=True)
            .select_related('course')
        )

from datetime import datetime, timedelta

import pytz
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from applications.models import Application
from .models import ClassSession
from .serializers import (
    ClassSessionSerializer,
    GenerateSessionsSerializer,
    SessionRescheduleSerializer,
)


def sessions_visible_to(user):
    """Every class a user is allowed to see."""
    if user.role == 'admin' or user.is_staff:
        return ClassSession.objects.all()
    return ClassSession.objects.filter(Q(student=user) | Q(teacher=user))


def teacher_is_free(teacher, start, end, exclude_id=None):
    """No other scheduled class for this teacher overlaps [start, end)."""
    clash = ClassSession.objects.filter(
        teacher=teacher,
        start_time__lt=end,
        end_time__gt=start,
        status='scheduled',
    )
    if exclude_id:
        clash = clash.exclude(id=exclude_id)
    return not clash.exists()


class SessionQuerysetMixin:
    """Shared base queryset, with the joins every serializer field needs."""

    serializer_class = ClassSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def base_queryset(self):
        return sessions_visible_to(self.request.user).select_related(
            'student', 'teacher', 'course', 'application',
        )


class UpcomingSessionsView(SessionQuerysetMixin, generics.ListAPIView):
    """View upcoming classes for the logged-in user"""

    def get_queryset(self):
        # A class stays "upcoming" until it has actually finished, so a student
        # who opens the page mid-lesson still sees the Join button.
        return self.base_queryset().filter(
            end_time__gte=timezone.now(), status='scheduled',
        ).order_by('start_time')


class SessionHistoryView(SessionQuerysetMixin, generics.ListAPIView):
    """Past classes, newest first - the backbone of the attendance screens."""

    def get_queryset(self):
        queryset = self.base_queryset().filter(end_time__lt=timezone.now())

        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        return queryset.order_by('-start_time')


class TeacherScheduleView(SessionQuerysetMixin, generics.ListAPIView):
    """Every class on one date, for whoever is asking."""

    def get_queryset(self):
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                day = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return ClassSession.objects.none()
        else:
            day = timezone.now().date()

        # The day is bounded in the viewer's own timezone, so "today" means
        # today where they are rather than today in UTC.
        try:
            tz = pytz.timezone(self.request.user.timezone or 'UTC')
        except pytz.UnknownTimeZoneError:
            tz = pytz.UTC

        start = tz.localize(datetime.combine(day, datetime.min.time()))
        end = start + timedelta(days=1)

        return self.base_queryset().filter(
            start_time__gte=start, start_time__lt=end,
        ).order_by('start_time')


class SessionDetailView(SessionQuerysetMixin, generics.RetrieveAPIView):
    """One class."""

    lookup_field = 'id'

    def get_queryset(self):
        return self.base_queryset()


class CreateSessionView(APIView):
    """Admin/Teacher: Create a new class session"""

    # IsAdminUser checks Django's `is_staff`; our admins are `role='admin'`.
    permission_classes = [IsAdmin]

    def post(self, request):
        data = request.data
        application_id = data.get('application_id')

        # Get the application
        application = get_object_or_404(Application, id=application_id)

        # Get teacher
        teacher = application.assigned_teacher
        if not teacher:
            return Response({
                'error': 'No teacher assigned to this application'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not application.student:
            return Response({
                'error': 'This application has no student account yet. Approve it first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Parse date and time
        start_time = data.get('start_time')
        duration = data.get('duration') or application.course.duration_minutes

        try:
            start = datetime.fromisoformat(str(start_time).replace('Z', '+00:00'))
            if timezone.is_naive(start):
                start = timezone.make_aware(start, pytz.UTC)
            end = start + timedelta(minutes=int(duration))
        except (AttributeError, TypeError, ValueError):
            return Response({
                'error': 'Invalid date format. Use ISO format: 2026-07-15T17:00:00Z'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if teacher is available
        if not teacher_is_free(teacher, start, end):
            return Response({
                'error': 'Teacher is already booked at this time'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create session
        session = ClassSession.objects.create(
            student=application.student,
            teacher=teacher,
            course=application.course,
            application=application,
            start_time=start,
            end_time=end,
            status='scheduled',
            # The teacher pastes a Google Meet link; see SessionRescheduleSerializer.
            meeting_link=data.get('meeting_link', ''),
        )

        serializer = ClassSessionSerializer(session, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GenerateSessionsView(APIView):
    """
    Admin: create a whole run of classes at once.

    Scheduling a month of three-times-a-week lessons is twelve calls to
    CreateSessionView. This does it in one, and reports which slots it had to
    skip because the teacher was already booked.
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        form = GenerateSessionsSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data

        application = get_object_or_404(Application, id=data['application_id'])

        teacher = application.assigned_teacher
        if not teacher:
            return Response(
                {'error': 'No teacher assigned to this application'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not application.student:
            return Response(
                {'error': 'This application has no student account yet. Approve it first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        weekdays = data.get('weekdays') or GenerateSessionsSerializer.DAY_PRESETS.get(
            application.preferred_days, [0, 2, 4],
        )
        duration = data.get('duration_minutes') or application.course.duration_minutes

        # Times are given in the family's local timezone and stored in UTC.
        tz_name = data.get('timezone') or application.preferred_timezone or 'UTC'
        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            tz = pytz.UTC

        created, skipped = [], []
        day = data['start_date']
        last_day = day + timedelta(weeks=data['weeks'])

        while day < last_day:
            if day.weekday() in weekdays:
                naive = datetime.combine(day, data['time_of_day'])
                # is_dst=None would raise across a clock change; let pytz pick
                # so a DST boundary shifts the class rather than failing.
                start = tz.localize(naive).astimezone(pytz.UTC)
                end = start + timedelta(minutes=duration)

                if start < timezone.now():
                    skipped.append({'start_time': start, 'reason': 'in the past'})
                elif not teacher_is_free(teacher, start, end):
                    skipped.append({'start_time': start, 'reason': 'teacher already booked'})
                else:
                    created.append(ClassSession(
                        student=application.student,
                        teacher=teacher,
                        course=application.course,
                        application=application,
                        start_time=start,
                        end_time=end,
                        status='scheduled',
                    ))
            day += timedelta(days=1)

        if created:
            ClassSession.objects.bulk_create(created)

        # bulk_create doesn't populate related objects, so re-read for the response.
        fresh = ClassSession.objects.filter(
            id__in=[s.id for s in created],
        ).select_related('student', 'teacher', 'course')

        return Response({
            'message': f'Created {len(created)} classes.',
            'created_count': len(created),
            'skipped_count': len(skipped),
            'skipped': skipped,
            'sessions': ClassSessionSerializer(
                fresh, many=True, context={'request': request},
            ).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UpdateSessionView(APIView):
    """Update session details (reschedule, cancel, attach the meeting link)."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, session_id):
        session = get_object_or_404(ClassSession, id=session_id)

        # Check permissions
        is_admin = request.user.role == 'admin' or request.user.is_staff
        if not is_admin and request.user != session.teacher:
            return Response({
                'error': "You don't have permission to update this session"
            }, status=status.HTTP_403_FORBIDDEN)

        form = SessionRescheduleSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data

        if 'start_time' in data:
            duration = session.duration_minutes
            start = data['start_time']
            end = start + timedelta(minutes=duration)

            if not teacher_is_free(session.teacher, start, end, exclude_id=session.id):
                return Response({
                    'error': 'Teacher is already booked at this time'
                }, status=status.HTTP_400_BAD_REQUEST)

            session.start_time = start
            session.end_time = end

        for field in ('status', 'meeting_link', 'cancellation_reason', 'teacher_notes'):
            if field in data:
                setattr(session, field, data[field])

        session.save()

        serializer = ClassSessionSerializer(session, context={'request': request})
        return Response(serializer.data)

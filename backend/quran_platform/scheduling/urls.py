from django.urls import path
from .views import (
    UpcomingSessionsView, SessionHistoryView, TeacherScheduleView,
    SessionDetailView, CreateSessionView, GenerateSessionsView,
    UpdateSessionView,
)

urlpatterns = [
    path('upcoming/', UpcomingSessionsView.as_view(), name='upcoming-sessions'),
    path('history/', SessionHistoryView.as_view(), name='session-history'),
    path('schedule/', TeacherScheduleView.as_view(), name='teacher-schedule'),
    path('create/', CreateSessionView.as_view(), name='create-session'),
    path('generate/', GenerateSessionsView.as_view(), name='generate-sessions'),
    path('<uuid:id>/', SessionDetailView.as_view(), name='session-detail'),
    path('<uuid:session_id>/update/', UpdateSessionView.as_view(), name='update-session'),
]

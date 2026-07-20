from django.urls import path
from .views import (
    UpcomingSessionsView, TeacherScheduleView,
    CreateSessionView, UpdateSessionView
)

urlpatterns = [
    path('upcoming/', UpcomingSessionsView.as_view(), name='upcoming-sessions'),
    path('schedule/', TeacherScheduleView.as_view(), name='teacher-schedule'),
    path('create/', CreateSessionView.as_view(), name='create-session'),
    path('<uuid:session_id>/update/', UpdateSessionView.as_view(), name='update-session'),
]
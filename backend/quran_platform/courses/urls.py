from django.urls import path
from .views import CourseListView, CourseDetailView, CourseCreateView

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('create/', CourseCreateView.as_view(), name='course-create'),
    path('<uuid:id>/', CourseDetailView.as_view(), name='course-detail'),
]
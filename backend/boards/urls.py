from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('boards', views.BoardViewSet, basename='board')
router.register('cards', views.CardViewSet, basename='card')
router.register('routines', views.RoutineViewSet, basename='routine')
router.register('log', views.LogEntryViewSet, basename='logentry')

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
] + router.urls

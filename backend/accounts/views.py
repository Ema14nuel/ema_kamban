from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import generics, permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MeSerializer, UserCreateSerializer, UserSerializer
from .serializers import LogoutSerializer, RevocableRefreshSerializer
from .authentication import token_user
from .throttles import LoginIPThrottle, LoginAccountThrottle, SessionIPThrottle

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or not (obj.is_superuser or obj.is_staff)


class TokenObtainPairWithUserSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['auth_version'] = user.auth_version
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = TokenObtainPairWithUserSerializer
    throttle_classes = [LoginIPThrottle, LoginAccountThrottle]


class RefreshView(TokenRefreshView):
    serializer_class = RevocableRefreshSerializer
    throttle_classes = [SessionIPThrottle]


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [SessionIPThrottle]

    @transaction.atomic
    def post(self, request):
        incoming = LogoutSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        # Possession of a valid refresh authorizes revocation, never a user ID.
        user = token_user(incoming.validated_data['token'], lock=True)
        User.objects.filter(pk=user.pk).update(auth_version=models.F('auth_version') + 1)
        token = incoming.validated_data['token']
        if hasattr(token, 'blacklist'):
            token.blacklist()
        return Response(status=204)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if self.request.method in ('PUT', 'PATCH'):
            # Reload under a lock: never overwrite auth_version from a stale request.user.
            return User.objects.select_for_update().get(pk=self.request.user.pk)
        return self.request.user

    @transaction.atomic
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            qs = qs.select_for_update()
        return qs if self.request.user.is_superuser else qs.filter(is_superuser=False, is_staff=False)

    @transaction.atomic
    def update(self, *args, **kwargs):
        return super().update(*args, **kwargs)

    @transaction.atomic
    def destroy(self, *args, **kwargs):
        return super().destroy(*args, **kwargs)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_staff') and not self.request.user.is_superuser:
            raise PermissionDenied('Solo un superusuario puede conceder roles.')
        serializer.save()

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_staff') and not self.request.user.is_superuser:
            raise PermissionDenied('Solo un superusuario puede conceder roles.')
        serializer.save()

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == 'create' else UserSerializer

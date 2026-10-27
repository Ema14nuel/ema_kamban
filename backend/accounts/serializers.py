from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.files.base import ContentFile
from django.db import transaction
from io import BytesIO
import warnings
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .authentication import token_user

User = get_user_model()


class SafeAvatarField(serializers.FileField):
    """Only invoke necessary decoders, then store a canonical metadata-free PNG."""
    def to_internal_value(self, data):
        data = super().to_internal_value(data)
        if data.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('La foto debe pesar como máximo 2 MB.')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(data, formats=['PNG', 'JPEG']) as image:
                    if max(image.size) > 2048 or image.width * image.height > 4000000:
                        raise serializers.ValidationError('La foto debe tener como máximo 2048 px por lado y 4 millones de píxeles.')
                    image.load()
                    clean = Image.new('RGB', image.size)
                    clean.paste(image.convert('RGB'))
                    output = BytesIO()
                    clean.save(output, format='PNG')
            return ContentFile(output.getvalue(), name=f'{uuid4().hex}.png')
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise serializers.ValidationError('Usa una imagen PNG o JPEG válida.')


class RevocableRefreshSerializer(TokenRefreshSerializer):
    @transaction.atomic
    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        token_user(token, lock=True)
        # Revalidation inside the user lock serializes rotation/replay attempts.
        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(max_length=4096, write_only=True)
    access = serializers.CharField(max_length=4096, write_only=True, required=False, allow_null=True)

    def validate(self, attrs):
        # A still-valid access token also permits logout during refresh rotation.
        if attrs.get('access'):
            try:
                attrs['token'] = AccessToken(attrs['access'])
                return attrs
            except TokenError:
                pass
        try:
            attrs['token'] = RefreshToken(attrs['refresh'])
        except TokenError:
            raise InvalidToken('Sesión no válida.')
        return attrs


class UserSerializer(serializers.ModelSerializer):
    avatar = SafeAvatarField(required=False, allow_null=True)
    # Opcional: si un admin la manda, resetea la contraseña de la cuenta.
    # Nunca se devuelve (write_only) — todo lo demás sigue como antes.
    password = serializers.CharField(write_only=True, required=False, allow_blank=False, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_staff', 'is_active', 'sprite', 'avatar', 'notify_on_pomodoro', 'date_joined', 'password',
        ]
        read_only_fields = ['id', 'date_joined']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class MeSerializer(serializers.ModelSerializer):
    avatar = SafeAvatarField(required=False, allow_null=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'sprite', 'avatar', 'notify_on_pomodoro']
        read_only_fields = ['id', 'username', 'is_staff']

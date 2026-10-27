from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.utils import get_md5_hash_password


def token_user(token, *, lock=False):
    users = get_user_model().objects
    if lock:
        users = users.select_for_update()
    try:
        user = users.get(pk=token.get(api_settings.USER_ID_CLAIM))
    except (get_user_model().DoesNotExist, ValueError, TypeError):
        raise AuthenticationFailed('Sesión no válida.')
    if (not user.is_active or token.get('auth_version') != user.auth_version
            or token.get(api_settings.REVOKE_TOKEN_CLAIM) != get_md5_hash_password(user.password)):
        raise AuthenticationFailed('Sesión revocada.')
    return user


class RevocableJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get('auth_version') != user.auth_version:
            raise AuthenticationFailed('Sesión revocada.')
        return user

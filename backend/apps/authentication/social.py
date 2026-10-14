"""
Login con Google y GitHub (djoser social + social-auth-app-django).

Pasos propios del pipeline de social-auth y la estrategia de tokens que usa djoser
para responder: si el usuario tiene 2FA activado no se entregan tokens, se envía
el código por correo igual que en el login con contraseña.
"""
import re

import requests

from django.contrib.auth import get_user_model
from djoser.social.serializers import ProviderAuthSerializer
from djoser.social.views import ProviderAuthView
from rest_framework import serializers
from social_core.exceptions import AuthForbidden

from core.permissions import HasValidAPIKey


User = get_user_model()


def require_verified_email(backend, details, response, *args, **kwargs):
    """
    Exige un correo verificado por el proveedor: con él se crea la cuenta o se
    vincula a una existente (associate_by_email), así que no puede ser uno sin confirmar.
    """
    if backend.name == "google-oauth2":
        if not details.get("email") or not response.get("email_verified"):
            raise AuthForbidden(backend)

    elif backend.name == "github":
        # GitHub puede devolver un correo principal sin verificar; se elige uno verificado
        emails = backend.get_json(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"token {response['access_token']}"},
        )
        verified = [e for e in emails if isinstance(e, dict) and e.get("verified")]
        verified.sort(key=lambda e: not e.get("primary"))
        if not verified:
            raise AuthForbidden(backend)
        details["email"] = verified[0]["email"]

    details["email"] = User.objects.normalize_email(details["email"])


def get_username(strategy, details, backend, user=None, *args, **kwargs):
    """Username único con los mismos caracteres que permite sanitize_username."""
    if user:
        return {"username": user.username}

    base = details.get("username") or details["email"].split("@")[0]
    base = re.sub(r"[^a-zA-Z0-9_-]", "", base)[:90]
    if len(base) < 3 or base.lower() in User.objects.RESTRICTED_USERNAMES:
        base = f"{base}user"

    username, suffix = base, 1
    while User.objects.filter(username__iexact=username).exists():
        suffix += 1
        username = f"{base}{suffix}"

    return {"username": username}


def activate_user(backend, user=None, is_new=False, *args, **kwargs):
    """
    El correo ya lo verificó el proveedor, así que se activan las cuentas nuevas y
    las que nunca completaron la activación. Una cuenta desactivada por un admin
    (ya inició sesión alguna vez) sigue bloqueada.
    """
    if not user or user.is_active:
        return

    if is_new or user.last_login is None:
        user.is_active = True
        user.save(update_fields=["is_active"])
    else:
        raise AuthForbidden(backend)


class TwoFactorTokenStrategy:
    @classmethod
    def obtain(cls, user):
        from .views import _login_tokens, _send_login_otp

        if user.two_factor_enabled:
            _send_login_otp(user)
            return {"otp_required": True, "email": user.email}

        return _login_tokens(user)


class SocialAuthSerializer(ProviderAuthSerializer):
    user = None
    otp_required = serializers.BooleanField(read_only=True)
    email = serializers.EmailField(read_only=True)

    def validate(self, attrs):
        # Código caducado o rechazado: el proveedor responde con error HTTP y no con AuthException
        try:
            return super().validate(attrs)
        except requests.RequestException:
            raise serializers.ValidationError("The provider rejected the authorization code.")


class SocialAuthView(ProviderAuthView):
    """
    GET  /auth/o/<provider>/?redirect_uri=...  -> authorization_url (guarda el state en la sesión)
    POST /auth/o/<provider>/?code=...&state=... -> tokens, u otp_required si tiene 2FA
    Solo lo llama el servidor de Next.js, que reenvía la cookie de sesión entre ambos pasos.
    """
    permission_classes = [HasValidAPIKey]
    serializer_class = SocialAuthSerializer

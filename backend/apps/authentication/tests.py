from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from social_core.exceptions import AuthForbidden

from .social import TwoFactorTokenStrategy, activate_user, get_username, require_verified_email


User = get_user_model()

API_KEY = "test-api-key"


def make_user(**kwargs):
    defaults = {"email": "ana@example.com", "username": "ana", "first_name": "Ana", "last_name": "Pérez"}
    defaults.update(kwargs)
    return User.objects.create_user(password="S3gura!pass", **defaults)


class FakeBackend:
    def __init__(self, name, emails=None):
        self.name = name
        self.emails = emails or []

    def get_json(self, url, headers=None):
        return self.emails


class PipelineTests(TestCase):
    def test_google_requires_verified_email(self):
        details = {"email": "ana@example.com"}
        with self.assertRaises(AuthForbidden):
            require_verified_email(FakeBackend("google-oauth2"), details, {"email_verified": False})
        require_verified_email(FakeBackend("google-oauth2"), details, {"email_verified": True})

    def test_github_picks_verified_primary_email(self):
        backend = FakeBackend("github", [
            {"email": "falso@example.com", "verified": False, "primary": True},
            {"email": "otro@example.com", "verified": True, "primary": False},
        ])
        details = {"email": "falso@example.com"}
        require_verified_email(backend, details, {"access_token": "x"})
        self.assertEqual(details["email"], "otro@example.com")

        with self.assertRaises(AuthForbidden):
            require_verified_email(FakeBackend("github", [{"email": "a@b.c", "verified": False}]), {}, {"access_token": "x"})

    def test_username_is_sanitized_and_unique(self):
        make_user()
        self.assertEqual(get_username(None, {"username": "ana", "email": "ana@x.com"}, None)["username"], "ana2")
        self.assertEqual(get_username(None, {"email": "j.o+n@x.com"}, None)["username"], "jon")
        self.assertEqual(get_username(None, {"username": "admin", "email": "a@x.com"}, None)["username"], "adminuser")

    def test_activation_rules(self):
        pending = make_user()
        activate_user(FakeBackend("github"), user=pending)
        pending.refresh_from_db()
        self.assertTrue(pending.is_active)

        from django.utils import timezone
        banned = make_user(email="b@example.com", username="banned", last_login=timezone.now())
        with self.assertRaises(AuthForbidden):
            activate_user(FakeBackend("github"), user=banned)

    def test_token_strategy_respects_2fa(self):
        user = make_user(is_active=True)
        self.assertIn("access", TwoFactorTokenStrategy.obtain(user))

        user.two_factor_enabled = True
        with mock.patch("apps.authentication.views.send_mail") as send_mail:
            data = TwoFactorTokenStrategy.obtain(user)
        self.assertEqual(data, {"otp_required": True, "email": user.email})
        send_mail.assert_called_once()


@override_settings(
    VALID_API_KEYS=[API_KEY],
    SOCIAL_AUTH_GITHUB_KEY="client-id",
    SOCIAL_AUTH_GITHUB_SECRET="secret",
)
class SocialAuthViewTests(TestCase):
    def setUp(self):
        from djoser.conf import settings as djoser_settings

        self.client = APIClient()
        self.redirect_uri = next(u for u in djoser_settings.SOCIAL_AUTH_ALLOWED_REDIRECT_URIS if "/github/" in u)

    def test_requires_api_key(self):
        res = self.client.get("/auth/o/github/", {"redirect_uri": self.redirect_uri})
        self.assertIn(res.status_code, (401, 403))

    def test_authorization_url(self):
        res = self.client.get("/auth/o/github/", {"redirect_uri": self.redirect_uri}, HTTP_API_KEY=API_KEY)
        self.assertEqual(res.status_code, 200)
        self.assertIn("github.com/login/oauth/authorize", res.data["authorization_url"])
        self.assertIn("sessionid", res.cookies)

    def test_rejects_unknown_redirect_uri(self):
        res = self.client.get("/auth/o/github/", {"redirect_uri": "https://evil.example/cb"}, HTTP_API_KEY=API_KEY)
        self.assertEqual(res.status_code, 400)

    def _github_login(self, emails):
        res = self.client.get("/auth/o/github/", {"redirect_uri": self.redirect_uri}, HTTP_API_KEY=API_KEY)
        state = res.data["authorization_url"].split("state=")[1].split("&")[0]

        def get_json(url, *args, **kwargs):
            if url.endswith("/user/emails"):
                return emails
            return {"id": 4242, "login": "ana.gh", "name": "Ana Pérez", "email": None}

        with mock.patch("social_core.backends.github.GithubOAuth2.request_access_token", return_value={"access_token": "tok"}), \
                mock.patch("social_core.backends.github.GithubOAuth2.get_json", side_effect=get_json):
            return self.client.post(f"/auth/o/github/?code=abc&state={state}", HTTP_API_KEY=API_KEY)

    def test_github_login_creates_active_user(self):
        res = self._github_login([{"email": "ana@example.com", "verified": True, "primary": True}])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIn("access", res.data)

        user = User.objects.get(email="ana@example.com")
        self.assertTrue(user.is_active)
        self.assertEqual(user.username, "anagh")
        self.assertEqual((user.first_name, user.last_name), ("Ana", "Pérez"))
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.social_auth.filter(provider="github", uid="4242").exists())

    def test_github_login_links_existing_account_and_asks_2fa(self):
        user = make_user(is_active=True, two_factor_enabled=True)
        with mock.patch("apps.authentication.views.send_mail"):
            res = self._github_login([{"email": "ana@example.com", "verified": True, "primary": True}])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data, {"otp_required": True, "email": "ana@example.com"})
        self.assertTrue(user.social_auth.filter(provider="github").exists())

    def test_github_login_rejects_unverified_email(self):
        make_user(is_active=True)
        res = self._github_login([{"email": "ana@example.com", "verified": False, "primary": True}])
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.get(email="ana@example.com").social_auth.exists())

    def test_invalid_state_is_rejected(self):
        self.client.get("/auth/o/github/", {"redirect_uri": self.redirect_uri}, HTTP_API_KEY=API_KEY)
        res = self.client.post("/auth/o/github/?code=abc&state=otro", HTTP_API_KEY=API_KEY)
        self.assertEqual(res.status_code, 400)

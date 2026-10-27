import os
from pathlib import Path
import runpy
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase


class SecurityConfigurationTests(SimpleTestCase):
    def load(self, **values):
        env = {'DJANGO_READ_DOTENV': 'False', 'DB_ENGINE': 'sqlite', 'SQLITE_PATH': ':memory:',
               'DJANGO_SECRET_KEY': 'synthetic-test-fixture-not-a-real-secret-0123456789-abc', **values}
        with patch.dict(os.environ, env, clear=True), patch('dotenv.load_dotenv') as loader:
            config = runpy.run_path(str(Path(__file__).with_name('settings.py')))
            loader.assert_not_called()
        return config

    def test_missing_weak_and_known_placeholder_secrets_fail_closed(self):
        for secret in ('', 'change-me', 'a' * 60, 'django-insecure-' + 'x' * 60, 'cambiame-' + 'x' * 60):
            with self.subTest(secret_kind=len(secret)):
                with self.assertRaises(ImproperlyConfigured):
                    self.load(DJANGO_SECRET_KEY=secret)

    def test_production_defaults_and_proxy_are_explicit(self):
        config = self.load()
        self.assertFalse(config['DEBUG'])
        self.assertTrue(config['SECURE_SSL_REDIRECT'])
        self.assertTrue(config['SESSION_COOKIE_SECURE'])
        self.assertTrue(config['CSRF_COOKIE_SECURE'])
        self.assertNotIn('SECURE_PROXY_SSL_HEADER', config)
        self.assertEqual(self.load(DJANGO_TRUST_PROXY='True')['SECURE_PROXY_SSL_HEADER'], ('HTTP_X_FORWARDED_PROTO', 'https'))

    def test_development_requires_explicit_debug(self):
        config = self.load(DJANGO_DEBUG='True')
        self.assertTrue(config['DEBUG'])
        self.assertFalse(config['SECURE_SSL_REDIRECT'])

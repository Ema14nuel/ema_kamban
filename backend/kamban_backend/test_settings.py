"""Synthetic tests only: never load dotenv or connect to an existing database."""
import os

os.environ['DJANGO_READ_DOTENV'] = 'False'
os.environ['DJANGO_SECRET_KEY'] = 'synthetic-test-fixture-only-not-a-real-secret-0123456789'
os.environ['DB_ENGINE'] = 'sqlite'
os.environ['SQLITE_PATH'] = ':memory:'

from .settings import *  # noqa: E402,F403

DATABASES = {'default': {
    'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:',
    'TEST': {'NAME': ':memory:'},
}}
DEBUG = False
SECURE_SSL_REDIRECT = False
ALLOWED_HOSTS = ['testserver', 'localhost']
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# Tests have no collected static directory; avoid unrelated WhiteNoise warnings.
MIDDLEWARE = [m for m in MIDDLEWARE if m != 'whitenoise.middleware.WhiteNoiseMiddleware']

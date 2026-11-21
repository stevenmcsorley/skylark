import os
import runpy
from unittest.mock import patch

from django.test import SimpleTestCase

from core import settings
from core.settings import parse_database_url


class SettingsTests(SimpleTestCase):
    def test_postgres(self):
        for url, password, port in [
            ("postgres://user:pass@db:5433/app", "pass", 5433),
            ("postgres://user@db/app", None, 5432),
        ]:
            with self.subTest(url=url):
                self.assertEqual(parse_database_url(url), {
                    "ENGINE": "django.db.backends.postgresql", "NAME": "app",
                    "USER": "user", "PASSWORD": password, "HOST": "db", "PORT": port,
                })

    def test_sqlite_files(self):
        for path in ["db.sqlite3", "/tmp/db.sqlite3"]:
            self.assertEqual(parse_database_url(f"sqlite:///{path}"),
                             {"ENGINE": "django.db.backends.sqlite3", "NAME": path})

    def test_sqlite_memory(self):
        for url in ["sqlite://", "sqlite:///:memory:"]:
            self.assertEqual(parse_database_url(url),
                             {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"})

    @patch("dotenv.load_dotenv")
    def test_management_command_defaults(self, load_dotenv):
        with patch.dict(os.environ, {}, clear=True), patch("sys.argv", ["manage.py", "check"]):
            config = runpy.run_path(settings.__file__)
        self.assertEqual(config["DATABASE_URL"], "postgres://sentry:sentry@localhost:5432/sentry")
        self.assertEqual(config["CHANNEL_LAYERS"]["default"]["BACKEND"], "channels_redis.core.RedisChannelLayer")
        self.assertEqual(config["EMAIL_BACKEND"], "django.core.mail.backends.console.EmailBackend")
        self.assertEqual(config["CELERY_BROKER_URL"], "redis://localhost:6379/0")
        self.assertNotIn("CELERY_TASK_ALWAYS_EAGER", config)
        self.assertNotIn("PASSWORD_HASHERS", config)

    def test_test_backends(self):
        self.assertTrue(settings.CELERY_TASK_ALWAYS_EAGER)
        self.assertFalse(settings.CELERY_TASK_EAGER_PROPAGATES)
        self.assertEqual(settings.CHANNEL_LAYERS["default"]["BACKEND"],
                         "channels.layers.InMemoryChannelLayer")
        self.assertEqual(settings.EMAIL_BACKEND, "django.core.mail.backends.locmem.EmailBackend")
        self.assertEqual(settings.PASSWORD_HASHERS, ["django.contrib.auth.hashers.MD5PasswordHasher"])

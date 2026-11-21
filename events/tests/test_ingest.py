from collections import Counter
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from events.models import Event, Group
from .helpers import create_workspace_project


@override_settings(RATE_LIMIT_EVENTS_PER_MINUTE=120)
class IngestTests(TestCase):
    def setUp(self):
        _, _, self.project = create_workspace_project()
        self.url = f"/api/events/ingest/token/{self.project.ingest_token}/"
        self.client = APIClient()
        redis = self.enterContext(patch("events.ratelimit.get_redis")).return_value
        counts = Counter()

        def incr(key):
            counts[key] += 1
            return counts[key]

        redis.incr.side_effect = incr
        self.enterContext(patch("events.ratelimit.time")).time.return_value = 600
        self.publish = self.enterContext(patch("events.views.publish_event"))
        self.enterContext(patch("events.alerts.notify_group_signal"))

    def ingest(self, message="Broken pipe", **fields):
        response = self.client.post(self.url, {"message": message, **fields}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return Event.objects.get(pk=response.data["id"])

    def test_event_and_group(self):
        event = self.ingest(level="info", environment="stage")
        self.assertEqual(event.project, self.project)
        self.assertEqual(event.message, "Broken pipe")
        self.assertEqual(event.level, "info")
        self.assertEqual(event.environment, "stage")
        self.assertEqual(event.payload, {"message": "Broken pipe", "level": "info", "environment": "stage"})
        self.assertEqual(event.group.project, self.project)
        self.assertEqual(event.group.title, event.message)
        self.assertEqual(event.group.level, event.level)

    def test_unknown_token(self):
        response = self.client.post("/api/events/ingest/token/unknown/", {}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Event.objects.exists())

    def test_level_normalisation(self):
        for fields, level in [({"level": "ERROR"}, "error"), ({"level": "warn"}, "warning"), ({}, "error")]:
            with self.subTest(fields=fields):
                self.assertEqual(self.ingest(**fields).level, level)

    def test_repeat_increments_group_count(self):
        first = self.ingest()
        repeat = self.ingest()
        self.assertEqual(first.group_id, repeat.group_id)
        self.assertEqual(Group.objects.get().count, 2)

    def test_distinct_messages_create_distinct_groups(self):
        self.assertNotEqual(self.ingest().group_id, self.ingest("Disconnected").group_id)
        self.assertEqual(Group.objects.count(), 2)

    def test_event_metadata(self):
        event = self.ingest(tags={"service": "web"}, release="1.0", stack="at main")
        self.assertEqual(event.tags, {"service": "web"})
        self.assertEqual(event.release.version, "1.0")
        self.assertEqual(event.release.project, self.project)
        self.assertEqual(event.stack, "at main")

    @override_settings(RATE_LIMIT_EVENTS_PER_MINUTE=2)
    def test_rate_limit(self):
        self.ingest()
        self.ingest()
        response = self.client.post(self.url, {"message": "overflow"}, format="json")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(Event.objects.count(), 2)
        self.assertEqual(Group.objects.get().count, 2)

    @patch("events.views.process_event.delay", side_effect=RuntimeError("worker unavailable"))
    def test_task_failure_still_accepts_event(self, delay):
        event = self.ingest()
        delay.assert_called_once_with(event.id)

    def test_publish_failure_still_accepts_event(self):
        self.publish.side_effect = RuntimeError("broker unavailable")
        self.ingest()
        self.publish.assert_called_once()

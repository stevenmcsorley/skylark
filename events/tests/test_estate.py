from datetime import datetime, timedelta, timezone

from django.test import TestCase

from events.models import Event, Group
from .helpers import authenticated_client, create_project, create_workspace_project


class EstateTests(TestCase):
    def setUp(self):
        user, workspace, self.project = create_workspace_project()
        self.empty, _ = create_project(workspace, "empty")
        self.client = authenticated_client(user, workspace)
        self.first = datetime(2025, 1, 1, tzinfo=timezone.utc)
        self.last = self.first + timedelta(hours=1)
        for title, status, at in [("Old", "resolved", self.first), ("New", "unresolved", self.last)]:
            group = Group.objects.create(project=self.project, title=title, fingerprint=title,
                                         status=status, last_seen=at)
            Event.objects.create(project=self.project, group=group, message=title, received_at=at)

    def overview_stats(self, project):
        response = self.client.get(f"/api/projects/{project.slug}/overview/")
        self.assertEqual(response.status_code, 200)
        return response.data["stats"]

    def test_overview(self):
        self.assertEqual(self.overview_stats(self.project), {
            "events_total": 2, "groups_total": 2, "groups_unresolved": 1,
            "first_event_at": self.first, "last_event_at": self.last,
        })

    def test_empty_overview(self):
        self.assertEqual(self.overview_stats(self.empty), {
            "events_total": 0, "groups_total": 0, "groups_unresolved": 0,
            "first_event_at": None, "last_event_at": None,
        })

    def test_estate(self):
        response = self.client.get("/api/estate/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"], {"events_total": 2, "projects": 2, "unresolved_total": 1})
        rows = {row["id"]: row for row in response.data["projects"]}
        active = rows[self.project.id]
        self.assertEqual(active["events_total"], 2)
        self.assertEqual(active["unresolved"], 1)
        self.assertEqual(active["last_event_at"], self.last)
        self.assertEqual(active["latest_issue"], {"title": "New", "level": "error", "last_seen": self.last})
        empty = rows[self.empty.id]
        self.assertEqual(empty["events_total"], 0)
        self.assertEqual(empty["unresolved"], 0)
        self.assertIsNone(empty["last_event_at"])
        self.assertIsNone(empty["latest_issue"])

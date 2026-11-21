from django.test import TestCase

from events.models import Group
from .helpers import authenticated_client, create_workspace_project


class GroupTests(TestCase):
    def setUp(self):
        user, workspace, project = create_workspace_project()
        self.client = authenticated_client(user, workspace)
        self.group = Group.objects.create(project=project, fingerprint="broken", title="Broken")
        self.url = f"/api/groups/{self.group.pk}/"

    def action(self, name, **data):
        response = self.client.post(f"{self.url}{name}/", data, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.group.refresh_from_db()

    def test_resolve(self):
        self.action("resolve")
        self.assertEqual(self.group.status, "resolved")
        self.assertIsNotNone(self.group.resolved_at)

    def test_unresolve(self):
        self.action("resolve")
        self.action("unresolve")
        self.assertEqual(self.group.status, "unresolved")
        self.assertIsNone(self.group.resolved_at)

    def test_regressed_at_is_exposed_and_cleared_by_hand(self):
        from django.utils import timezone
        Group.objects.filter(pk=self.group.pk).update(regressed_at=timezone.now())
        response = self.client.get(self.url)
        self.assertIsNotNone(response.json()["regressed_at"])
        self.action("resolve")
        self.assertIsNone(self.group.regressed_at)

    def test_ignore(self):
        self.action("ignore")
        self.assertEqual(self.group.status, "ignored")

    def test_assign(self):
        self.action("assign", assignee="on-call")
        self.assertEqual(self.group.assignee, "on-call")

    def test_comments(self):
        url = self.url + "comments/"
        created = self.client.post(url, {"body": "Investigating"}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(self.group.comments.get().body, "Investigating")
        listed = self.client.get(url)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data, [created.data])

    def test_bookmarks(self):
        self.action("bookmark")
        self.assertTrue(self.group.is_bookmarked)
        self.action("unbookmark")
        self.assertFalse(self.group.is_bookmarked)

    def test_other_workspace_read_and_resolve_return_404(self):
        user, workspace, _ = create_workspace_project("other")
        other = authenticated_client(user, workspace)
        self.assertEqual(other.get(self.url).status_code, 404)
        self.assertEqual(other.post(self.url + "resolve/").status_code, 404)
        self.group.refresh_from_db()
        self.assertEqual(self.group.status, "unresolved")

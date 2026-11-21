from django.test import TestCase

from events.models import Event, Group, Project, Workspace
from .helpers import authenticated_client, create_workspace_project


def make_group(project, title):
    group = Group.objects.create(project=project, fingerprint=f"error:{title}", title=title, level="error", count=0)
    return group


class EventGroupFilterTests(TestCase):
    def setUp(self):
        self.user, self.workspace, self.project = create_workspace_project("filter")
        self.client = authenticated_client(self.user, self.workspace)
        self.a = make_group(self.project, "A")
        self.b = make_group(self.project, "B")
        for group, n in ((self.a, 3), (self.b, 2)):
            for i in range(n):
                Event.objects.create(project=self.project, group=group, message=group.title, level="error")

    def ids(self, **params):
        response = self.client.get("/api/events/", params)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        return {e["id"] for e in (body["results"] if isinstance(body, dict) else body)}

    def test_group_filter_returns_only_that_issues_events(self):
        got = self.ids(group=self.a.id)
        self.assertEqual(got, set(Event.objects.filter(group=self.a).values_list("id", flat=True)))
        self.assertEqual(len(got), 3)

    def test_group_filter_combines_with_project(self):
        self.assertEqual(len(self.ids(project=self.project.slug, group=self.b.id)), 2)

    def test_non_numeric_group_returns_nothing_instead_of_failing(self):
        self.assertEqual(self.ids(group="abc"), set())

    def test_another_workspaces_issue_is_not_readable_through_the_filter(self):
        other_user, other_workspace, other_project = create_workspace_project("other")
        theirs = make_group(other_project, "Theirs")
        Event.objects.create(project=other_project, group=theirs, message="secret", level="error")
        self.assertEqual(self.ids(group=theirs.id), set())

    def test_no_filter_still_returns_everything_in_the_workspace(self):
        self.assertEqual(len(self.ids()), 5)

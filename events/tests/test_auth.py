from unittest.mock import patch
import os

from django.test import TestCase
from rest_framework.test import APIClient

from events.models import WorkspaceMember
from .helpers import create_workspace_project


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch.dict(os.environ, OPEN_SIGNUP="true")
    def test_register_creates_workspace_owner(self):
        response = self.client.post("/api/auth/register/", {
            "name": "Pat", "email": "pat@example.test", "password": "password",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        member = WorkspaceMember.objects.get(user__email="pat@example.test")
        self.assertEqual(member.role, "owner")
        self.assertEqual(response.data["user"]["id"], member.user_id)
        self.assertTrue(member.user.check_password("password"))

    def test_login_and_me(self):
        user, _, _ = create_workspace_project()
        login = self.client.post("/api/auth/login/", {"email": user.email, "password": "password"})
        self.assertEqual(login.status_code, 200, login.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["id"], user.id)
        self.assertEqual(me.data["email"], user.email)

    def test_bad_password(self):
        user, _, _ = create_workspace_project()
        response = self.client.post("/api/auth/login/", {"email": user.email, "password": "incorrect"})
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("access", response.data)

    def test_workspaces_require_auth(self):
        self.assertEqual(self.client.get("/api/workspaces/").status_code, 401)

    def test_members_require_auth(self):
        self.assertEqual(self.client.get("/api/workspaces/current/members/").status_code, 401)

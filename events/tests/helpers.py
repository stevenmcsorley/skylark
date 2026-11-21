from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from events.models import Project, Workspace, WorkspaceMember


def create_project(workspace, slug):
    project = Project.objects.create(workspace=workspace, name=slug, slug=slug)
    return project, project.ingest_token


def create_workspace_project(name="sample"):
    email = f"{name}@example.test"
    user = get_user_model().objects.create_user(email, email=email, password="password")
    workspace = Workspace.objects.create(name=name)
    WorkspaceMember.objects.create(user=user, workspace=workspace, role="owner")
    project, _ = create_project(workspace, name)
    return user, workspace, project


def authenticated_client(user, workspace):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(user)}",
                       HTTP_X_WORKSPACE_ID=str(workspace.pk))
    return client

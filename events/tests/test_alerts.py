from unittest.mock import patch

from django.test import TestCase

from events.alerts import evaluate_alerts_for_event
from events.models import AlertRule, Event, Group
from .helpers import create_workspace_project


class AlertTests(TestCase):
    def setUp(self):
        _, _, project = create_workspace_project()
        group = Group.objects.create(project=project, fingerprint="error", title="Error", level="error")
        self.event = Event.objects.create(project=project, group=group, level="error", message="Error")
        self.rule = AlertRule.objects.create(project=project, name="Errors", level="error",
                                             threshold_count=1, target_value="alerts@example.test")

    @patch("events.alerts.trigger_alert")
    def test_matching_event_triggers_delivery(self, deliver):
        evaluate_alerts_for_event(self.event)
        deliver.assert_called_once_with(self.rule, self.event)

    @patch("events.alerts.trigger_alert")
    def test_nonmatching_level_skips_delivery(self, deliver):
        self.rule.level = "warning"
        self.rule.save()
        evaluate_alerts_for_event(self.event)
        deliver.assert_not_called()

    @patch("events.alerts.trigger_alert")
    def test_below_threshold_skips_delivery(self, deliver):
        self.rule.threshold_count = 2
        self.rule.save()
        evaluate_alerts_for_event(self.event)
        deliver.assert_not_called()

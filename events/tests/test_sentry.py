import base64
import gzip
import json
import zlib
from pathlib import Path
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from events.grouping import compute_sentry_fingerprint
from events.models import Event, Group, Project
from events.sentry_compat import PayloadTooLarge, parse_auth, parse_envelope, read_body, to_skylark_event
from events.serializers import ProjectSerializer


def fixture(name):
    return json.loads((Path(__file__).parent / "fixtures" / "sentry" / f"{name}.json").read_bytes())


def envelope(event):
    return b'{}\n{"type":"event"}\n' + json.dumps(event).encode()


class ProtocolTests(SimpleTestCase):
    def test_plain_envelope(self):
        self.assertEqual(parse_envelope(envelope({})), ({}, [({"type": "event"}, b"{}")]))

    def test_sized_multiline_binary(self):
        raw = b'{}\n{"type":"attachment","length":4}\na\n\xffb\n{"type":"event"}\n{}'
        self.assertEqual([p for _, p in parse_envelope(raw)[1]], [b'a\n\xffb', b'{}'])

    def test_crlf(self):
        raw = b'{}\r\n{"type":"event","length":2}\r\n{}\r\n{"type":"session"}\r\n{}\r\n'
        self.assertEqual([p for _, p in parse_envelope(raw)[1]], [b'{}', b'{}'])

    def test_bad_headers(self):
        for raw in (b'', b'nonsense', b'[]', b'{}\n{}', b'{}\n{"type":"event"}\n'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                parse_envelope(raw)

    def test_bad_lengths(self):
        for size in (-1, True, "1", 4, 1):
            raw = b'{}\n' + json.dumps({"type": "event", "length": size}).encode() + b'\n{}'
            with self.subTest(size=size), self.assertRaises(ValueError):
                parse_envelope(raw)

    def test_plain_limit(self):
        with self.assertRaises(PayloadTooLarge):
            read_body(b"123", None, limit=2)

    def test_gzip_magic(self):
        self.assertEqual(read_body(gzip.compress(b"123"), None, limit=3), b"123")

    def test_zlib(self):
        self.assertEqual(read_body(zlib.compress(b"ok"), None), b"ok")

    def test_incomplete_gzip(self):
        with self.assertRaises(ValueError):
            read_body(gzip.compress(b"ok")[:-1], "gzip")

    def test_bomb(self):
        raw = gzip.compress(b"x" * 2_000_000)
        decoder = Mock(wraps=zlib.decompressobj(zlib.MAX_WBITS + 16))
        with patch("events.sentry_compat.zlib.decompressobj", return_value=decoder):
            with self.assertRaises(PayloadTooLarge):
                read_body(raw, "gzip", limit=100)
        decoder.decompress.assert_called_once_with(raw, 101)
        decoder.flush.assert_not_called()

    def test_auth_header(self):
        self.assertEqual(parse_auth("Sentry sentry_client=a/2, sentry_key=key, sentry_secret=old", {}), "key")

    def test_auth_query(self):
        self.assertEqual(parse_auth(None, {"sentry_key": "key"}), "key")


class MappingTests(SimpleTestCase):
    def setUp(self):
        self.event = fixture("python")
        self.fields = to_skylark_event(self.event)

    def test_exception_message(self):
        self.assertEqual(self.fields["message"], "KeyError: 'sku'")
        self.assertEqual(self.fields["level"], "error")

    def test_python_stack(self):
        self.assertEqual(self.fields["stack"], "KeyError: 'sku'\n    at lookup (/lib/catalog.py:9:0)\n"
                         "    at checkout (/srv/orders.py:21:0)")

    def test_browser_frames(self):
        fields = to_skylark_event(fixture("browser"))
        self.assertEqual(fields["frames"][0], {"function": "t", "file": "https://example.test/assets/main.min.js",
                                              "line": 1, "column": 61})

    def test_tags_dict(self):
        self.assertEqual(self.fields["tags"], [{"key": "region", "value": "west"}])

    def test_tags_list(self):
        self.assertEqual(to_skylark_event(fixture("browser"))["tags"], [{"key": "browser", "value": "Firefox"}])

    def test_metadata(self):
        self.assertEqual(self.fields["payload"], self.event)
        self.assertEqual((self.fields["release"], self.fields["environment"]), ("orders@1.0", "staging"))

    def test_defaults(self):
        fields = to_skylark_event({})
        self.assertEqual((fields["message"], fields["level"], fields["environment"]),
                         ("Unknown error", "info", "production"))

    def test_levels(self):
        for level, expected in [("fatal", "error"), ("error", "error"), ("warning", "warning"),
                                ("debug", "info"), ("info", "info")]:
            self.assertEqual(to_skylark_event({"level": level})["level"], expected)

    def test_message_object(self):
        self.assertEqual(to_skylark_event({"message": {"formatted": "hello\nworld"}})["message"], "hello")

    def test_logentry_formatted(self):
        fields = to_skylark_event({"logentry": {"formatted": "preferred", "message": "%s"}, "message": "other"})
        self.assertEqual(fields["message"], "preferred")

    def test_logentry_params(self):
        self.assertEqual(to_skylark_event({"logentry": {"message": "order %d", "params": [7]}})["message"], "order 7")

    def test_logentry_bad_format(self):
        fields = to_skylark_event({"logentry": {"message": "%100000000s", "params": [1]}, "message": "fallback"})
        self.assertEqual(fields["message"], "fallback")

    def test_message_limit(self):
        self.assertEqual(len(to_skylark_event({"message": "x" * 1001})["message"]), 1000)

    def test_breadcrumb_cap(self):
        for crumbs in ([1] * 120, {"values": [1] * 120}):
            result = to_skylark_event({"breadcrumbs": crumbs})["payload"]["breadcrumbs"]
            self.assertEqual(result if isinstance(result, list) else result["values"], [1] * 100)

    def test_payload_cap(self):
        self.event["extra"] = {"unicode": "💥" * 100000}
        result = to_skylark_event(self.event)["payload"]
        self.assertLessEqual(len(json.dumps(result)), 256 * 1024)
        self.assertEqual(result["event_id"], self.event["event_id"])
        self.assertTrue(result["extra"]["unicode"])

    def test_fingerprint_in_app(self):
        self.assertEqual(compute_sentry_fingerprint(self.event), ("exc:KeyError:orders.py:checkout", "KeyError: 'sku'"))

    def test_innermost_fallback(self):
        self.event["exception"]["values"][-1]["stacktrace"]["frames"][0]["in_app"] = False
        self.assertEqual(compute_sentry_fingerprint(self.event)[0], "exc:KeyError:catalog.py:lookup")

    def test_fingerprint_no_frames(self):
        exc = {"type": "Error", "value": "job 32\nfailed"}
        self.assertEqual(compute_sentry_fingerprint({"exception": {"values": [exc]}}),
                         ("exc:Error:job <n>\nfailed", "Error: job 32"))

    def test_line_number_ignored(self):
        before = compute_sentry_fingerprint(self.event)
        self.event["exception"]["values"][-1]["stacktrace"]["frames"][0]["lineno"] += 1
        self.assertEqual(compute_sentry_fingerprint(self.event), before)

    def test_message_group(self):
        self.assertEqual(compute_sentry_fingerprint({"message": "job 42"}), ("info:job <n>", "job <n>"))

    def test_custom_group(self):
        self.assertEqual(compute_sentry_fingerprint({"fingerprint": ["db", "read"]})[0], "custom:db|read")

    def test_default_expansion(self):
        self.event["fingerprint"] = ["tenant", "{{ default }}"]
        self.assertEqual(compute_sentry_fingerprint(self.event)[0], "custom:tenant|exc:KeyError:orders.py:checkout")

    def test_default_alone(self):
        expected = compute_sentry_fingerprint(self.event)
        self.event["fingerprint"] = ["{{ default }}"]
        self.assertEqual(compute_sentry_fingerprint(self.event), expected)


class EndpointTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name="demo", slug="demo")
        self.path = f"/api/{self.project.pk}/"
        self.client = APIClient(enforce_csrf_checks=True)
        self.key = self.project.ingest_token
        self.limiter = self.enterContext(patch("events.views.check_rate_limit", return_value=(True, 5)))
        self.delay = self.enterContext(patch("events.views.process_event.delay"))
        self.publish = self.enterContext(patch("events.views.publish_event"))
        self.enterContext(patch("events.alerts.notify_group_signal"))
        self.event = fixture("python")

    def post(self, data, route="envelope", **headers):
        return self.client.post(self.path + route + "/?sentry_key=" + self.key, data,
                                content_type="application/x-sentry-envelope", **headers)

    def test_sdk_envelope(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.post(envelope(self.event))
        self.assertEqual(response.json(), {"id": self.event["event_id"]})
        event = Event.objects.get()
        self.assertEqual(event.group.count, 1)
        self.assertEqual(event.payload, self.event)
        self.assertEqual(event.symbolicated["frames"][0]["function"], "lookup")
        self.delay.assert_called_once_with(event.id)
        self.publish.assert_called_once()

    def test_envelope_id_fallback(self):
        event_id = self.event.pop("event_id")
        header = json.dumps({"event_id": event_id}).encode()
        response = self.post(header + envelope(self.event)[2:])
        self.assertEqual(response.json(), {"id": event_id})
        self.assertEqual(Event.objects.get().payload["event_id"], event_id)

    def test_invalid_later_item_creates_no_events(self):
        response = self.post(envelope(self.event) + b'\n{"type":"event"}\ninvalid')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Event.objects.exists())

    def test_gzip_envelope(self):
        self.assertEqual(self.post(gzip.compress(envelope(self.event)), HTTP_CONTENT_ENCODING="gzip").status_code, 200)

    def test_header_only(self):
        response = self.client.post(self.path + "envelope/", envelope(self.event), content_type="text/plain",
                                    HTTP_X_SENTRY_AUTH=f"Sentry sentry_version=7, sentry_key={self.key}")
        self.assertEqual(response.status_code, 200)

    def test_wrong_key(self):
        self.key = "wrong"
        self.assertEqual(self.post(b"{}").status_code, 401)

    def test_missing_key(self):
        response = self.client.post(self.path + "store/", {}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_other_project_key(self):
        self.key = Project.objects.create(name="other", slug="other").ingest_token
        self.assertEqual(self.post(envelope(self.event)).status_code, 401)

    def test_unknown_project(self):
        self.path = "/api/999/"
        self.assertEqual(self.post(b"{}").status_code, 404)

    def test_invalid_body(self):
        self.assertEqual(self.post(b"oops").status_code, 400)

    def test_too_large(self):
        self.assertEqual(self.post(gzip.compress(b"x" * 1048577)).status_code, 413)

    def test_retry(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.post(envelope(self.event))
            response = self.post(json.dumps(self.event), "store")
        self.assertEqual(response.json(), {"id": self.event["event_id"]})
        self.assertEqual(Event.objects.count(), 1)
        self.assertEqual(Group.objects.get().count, 1)
        self.delay.assert_called_once()

    def test_regression_and_grouping(self):
        self.post(envelope(self.event))
        Group.objects.update(status=Group.STATUS_RESOLVED)
        self.event.pop("event_id")
        self.event["exception"]["values"][-1]["value"] = "different"
        self.post(envelope(self.event))
        group = Group.objects.get()
        self.assertEqual((group.count, group.status), (2, Group.STATUS_UNRESOLVED))
        self.assertIsNotNone(group.regressed_at)

    def test_distinct_locations(self):
        self.post(envelope(self.event))
        self.event.pop("event_id")
        self.event["exception"]["values"][-1]["stacktrace"]["frames"][0]["function"] = "refund"
        self.post(envelope(self.event))
        self.assertEqual(Group.objects.count(), 2)

    def test_ignored_items(self):
        response = self.post(b'{}\n{"type":"attachment","length":3}\n\xff\n!\n{"type":"session"}\n{}')
        self.assertEqual(response.json(), {})
        self.assertFalse(Event.objects.exists())

    def test_multiple_events(self):
        data = envelope(self.event) + b'\n{"type":"event"}\n' + json.dumps(fixture("browser")).encode()
        self.assertEqual(self.post(data).status_code, 200)
        self.assertEqual(Event.objects.count(), 2)

    def test_store_plain(self):
        self.assertEqual(self.post(json.dumps(self.event), "store").json(), {"id": self.event["event_id"]})

    def test_store_gzip(self):
        response = self.post(gzip.compress(json.dumps(self.event).encode()), "store", HTTP_CONTENT_ENCODING="gzip")
        self.assertEqual(response.json(), {"id": self.event["event_id"]})

    def test_store_base64_zlib(self):
        response = self.post(base64.b64encode(zlib.compress(json.dumps(self.event).encode())), "store")
        self.assertEqual(response.json(), {"id": self.event["event_id"]})

    def assert_cors(self, response):
        self.assertEqual(response["Access-Control-Allow-Origin"], "*")
        self.assertEqual(response["Access-Control-Allow-Headers"], "X-Sentry-Auth, Content-Type, Content-Encoding, Authorization")
        self.assertEqual(response["Access-Control-Allow-Methods"], "POST, OPTIONS")
        self.assertEqual(response["Access-Control-Max-Age"], "3600")

    @override_settings(CORS_ALLOW_ALL_ORIGINS=False, CORS_ALLOWED_ORIGINS=[])
    def test_preflight(self):
        headers = {"HTTP_ORIGIN": "https://foreign.test", "HTTP_ACCESS_CONTROL_REQUEST_METHOD": "POST"}
        for route in ("envelope/", "store/"):
            response = self.client.options(self.path + route, **headers)
            self.assertEqual(response.status_code, 200)
            self.assert_cors(response)
        self.assertNotIn("Access-Control-Allow-Origin", self.client.options("/api/projects/", **headers))

    def test_post_cors(self):
        self.assert_cors(self.post(envelope(self.event)))
        self.assert_cors(self.post(b"invalid"))

    def test_rate_limit(self):
        self.limiter.return_value = (False, 0)
        response = self.post(envelope(self.event))
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], "60")
        self.assertEqual(response["X-Sentry-Rate-Limits"], "60:error:key")
        self.assert_cors(response)
        self.assertEqual(self.limiter.call_args.args[0], f"token:{self.key}")
        self.assertFalse(Event.objects.exists())

    @override_settings(PUBLIC_ORIGIN="http://errors.example:8080/")
    def test_dsn(self):
        serializer = ProjectSerializer(self.project)
        self.assertTrue(serializer.fields["dsn"].read_only)
        self.assertEqual(serializer.data["dsn"], f"http://{self.key}@errors.example:8080/{self.project.id}")

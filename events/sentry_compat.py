"""Wire format and field conversion for Sentry SDK ingestion."""
import base64
import json
import re
import zlib
from collections.abc import Mapping


class PayloadTooLarge(ValueError):
    pass


def _zlib_header(raw):
    return (len(raw) >= 2 and raw[0] & 15 == 8 and raw[0] <= 0x78
            and int.from_bytes(raw[:2], "big") % 31 == 0)


def read_body(raw: bytes, content_encoding: str | None, limit: int = 1_048_576) -> bytes:
    encoding = (content_encoding or "").lower()
    if raw.startswith(b"\x1f\x8b") or encoding == "gzip":
        window = zlib.MAX_WBITS + 16
    elif encoding in ("zlib", "deflate") or _zlib_header(raw):
        window = zlib.MAX_WBITS
    else:
        if len(raw) > limit:
            raise PayloadTooLarge
        return raw

    decoder = zlib.decompressobj(window)
    try:
        body = decoder.decompress(raw, limit + 1)
    except zlib.error as exc:
        raise ValueError("Invalid compressed body") from exc
    if len(body) > limit:
        raise PayloadTooLarge
    if not decoder.eof or decoder.unused_data:
        raise ValueError("Incomplete or trailing compressed data")
    return body


def json_object(raw: bytes) -> dict:
    obj = json.loads(raw)
    if not isinstance(obj, dict):
        raise ValueError("Expected a JSON object")
    return obj


def parse_store(raw: bytes, encoding: str | None) -> dict:
    binary = raw.startswith(b"\x1f\x8b") or _zlib_header(raw)
    if not encoding and not binary and not raw.lstrip().startswith(b"{"):
        # Inspect only the prefix before decoding a legacy base64-wrapped zlib stream.
        encoded = raw.strip()
        try:
            prefix = base64.b64decode(encoded[:4], validate=True)
        except ValueError:
            prefix = b""
        if _zlib_header(prefix):
            raw = base64.b64decode(encoded, validate=True)
            encoding = "deflate"
    return json_object(read_body(raw, encoding))


def parse_envelope(body: bytes) -> tuple[dict, list[tuple[dict, bytes]]]:
    pos = 0

    def line():
        nonlocal pos
        end = body.find(b"\n", pos)
        if end == -1:
            result = body[pos:]
            pos = len(body)
            return result
        result = body[pos:end].removesuffix(b"\r")
        pos = end + 1
        return result

    header = json_object(line())
    items = []
    while pos < len(body):
        item = json_object(line())
        if not isinstance(item.get("type"), str):
            raise ValueError("Missing item type")
        if "length" in item:
            size = item["length"]
            if type(size) is not int or size < 0 or size > len(body) - pos:
                raise ValueError("Invalid item length")
            payload = body[pos:pos + size]
            pos += size
            if pos < len(body) and line() != b"":
                raise ValueError("Missing item delimiter")
        else:
            if pos == len(body):
                raise ValueError("Missing item payload")
            payload = line()
        items.append((item, payload))
    return header, items


def parse_auth(header: str | None, query: Mapping) -> str | None:
    scheme, _, params = (header or "").partition(" ")
    if scheme.lower() == "sentry":
        for part in params.split(","):
            name, _, value = part.strip().partition("=")
            if name == "sentry_key":
                return value.strip()
    return query.get("sentry_key")


def primary_exception(event):
    values = (event.get("exception") or {}).get("values") or []
    return values[-1] if values else None


def exception_frames(exception):
    return (exception.get("stacktrace") or {}).get("frames") or []


# Bound widths, precision and argument count before applying an SDK-supplied format.
_PLACEHOLDER = re.compile(r"%%|%[-+#0 ]*\d{0,3}(?:\.\d{1,3})?[diouxXeEfFgGcrsa]")


def _format_log(template, params):
    if not isinstance(params, list) or len(params) > 1000 or "%" in _PLACEHOLDER.sub("", template):
        return None
    if not all(isinstance(p, (str, float, int, type(None))) for p in params):
        return None
    try:
        return template % tuple(params)
    except (TypeError, ValueError, OverflowError):
        return None


def message_level(event):
    exc = primary_exception(event)
    log = event.get("logentry") or {}
    message = event.get("message")
    if isinstance(message, dict):
        message = message.get("formatted")
    if exc is not None:
        message = f"{exc.get('type') or 'Error'}: {exc.get('value') or ''}"
    elif log.get("formatted"):
        message = log["formatted"]
    elif log.get("message"):
        template = log["message"]
        params = log.get("params") or []
        if not params:
            message = template
        else:
            message = _format_log(template, params) or message
    level = {"fatal": "error", "error": "error", "warning": "warning",
             "debug": "info", "info": "info"}.get(event.get("level"), "error" if exc is not None else "info")
    return (message or "Unknown error").splitlines()[0][:1000], level


def _capped_payload(event):
    payload = dict(event)
    crumbs = payload.get("breadcrumbs")
    if isinstance(crumbs, list):
        payload["breadcrumbs"] = crumbs[:100]
    elif isinstance(crumbs, dict) and isinstance(crumbs.get("values"), list):
        payload["breadcrumbs"] = {**crumbs, "values": crumbs["values"][:100]}

    def trim(value, width):
        if isinstance(value, str):
            return value[:width]
        if isinstance(value, list):
            return [trim(v, width) for v in value[:width]]
        if isinstance(value, dict):
            return {k[:width]: trim(v, width) for k, v in list(value.items())[:width]}
        return value

    width = 65536
    while len(json.dumps(payload, allow_nan=False)) > 256 * 1024:
        payload = trim(payload, width)
        if isinstance(event.get("event_id"), str) and len(event["event_id"]) == 32:
            payload["event_id"] = event["event_id"]
        width //= 2
    return payload


def to_skylark_event(sentry_event: dict) -> dict:
    event = sentry_event
    message, level = message_level(event)
    exc = primary_exception(event)
    frames = [
        {"function": fr.get("function") or "<anon>", "file": fr.get("filename") or fr.get("abs_path") or "",
         "line": fr.get("lineno") or 0, "column": fr.get("colno") or 0}
        for fr in reversed(exception_frames(exc or {}))
    ]
    stack = [message] if exc is not None else []
    stack.extend("    at {function} ({file}:{line}:{column})".format(**fr) for fr in frames)
    tags = event.get("tags") or []
    pairs = tags.items() if isinstance(tags, dict) else tags
    return {
        "message": message, "level": level, "environment": (event.get("environment") or "production")[:64],
        "release": (event.get("release") or "")[:200] or None,
        "tags": [{"key": k, "value": v} for k, v in pairs],
        "stack": "\n".join(stack), "frames": frames, "payload": _capped_payload(event),
    }

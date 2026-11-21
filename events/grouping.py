import hashlib
import re
from typing import Tuple

from .sentry_compat import exception_frames, message_level, primary_exception


_NUMBER_RE = re.compile(r"\b\d+\b")
_HEX_RE = re.compile(r"\b0x[0-9a-fA-F]+\b")
_UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def normalize_message(message: str) -> str:
    if not message:
        return ""
    m = message.strip()
    m = _EMAIL_RE.sub("<email>", m)
    m = _UUID_RE.sub("<uuid>", m)
    m = _HEX_RE.sub("<hex>", m)
    m = _NUMBER_RE.sub("<n>", m)
    return m[:500]


def compute_fingerprint(message: str, level: str = "error") -> Tuple[str, str]:
    normalized = normalize_message(message)
    # Very simple fingerprint: level + normalized message
    fingerprint = f"{level}:{normalized}"
    title = normalized[:120] or (message[:120] if message else "event")
    return fingerprint, title


def _bounded_fingerprint(value):
    if len(value) <= 512:
        return value
    return value[:447] + ":" + hashlib.sha256(value.encode()).hexdigest()


def compute_sentry_fingerprint(sentry_event: dict) -> tuple[str, str]:
    message, level = message_level(sentry_event)
    exc = primary_exception(sentry_event)
    if exc is None:
        default, title = compute_fingerprint(message, level)
    else:
        kind = exc.get("type") or "Error"
        frames = exception_frames(exc)
        if frames:
            frame = next((f for f in reversed(frames) if f.get("in_app") is True), frames[-1])
            location = frame.get("module") or frame.get("filename") or frame.get("abs_path") or ""
            basename = location.replace("\\", "/").rsplit("/", 1)[-1]
            default = f"exc:{kind}:{basename}:{frame.get('function') or '<anon>'}"
        else:
            default = f"exc:{kind}:{normalize_message(exc.get('value') or '')}"
        title = message[:120]
    default = _bounded_fingerprint(default)
    parts = sentry_event.get("fingerprint")
    if isinstance(parts, list) and parts != ["{{ default }}"]:
        default = "custom:" + "|".join(default if part == "{{ default }}" else part for part in parts)
    return _bounded_fingerprint(default), title

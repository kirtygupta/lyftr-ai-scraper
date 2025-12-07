import hashlib
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

def make_id(label: str, idx: int) -> str:
    base = (label or "section") + str(idx)
    h = hashlib.sha1(base.encode("utf-8")).hexdigest()[:8]
    safe = "".join(c if c.isalnum() else "-" for c in label.lower())[:20]
    return f"{safe}-{h}"

def safe_absolute_url(href: str, base: str) -> str:
    try:
        if href.startswith("http://") or href.startswith("https://"):
            return href
        return urljoin(base, href)
    except Exception:
        return href

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

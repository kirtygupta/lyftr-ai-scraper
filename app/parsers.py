# app/parsers.py
from bs4 import BeautifulSoup, NavigableString
from urllib.parse import urljoin
from .utils import make_id, safe_absolute_url
from typing import List, Dict, Any
import re

RAW_HTML_TRUNCATE = 1000  # characters

def extract_meta(html: str, base_url: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    title = ""
    desc = ""
    lang = ""
    canonical = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        title = og["content"].strip()
    desc_meta = soup.find("meta", attrs={"name": "description"})
    if desc_meta and desc_meta.get("content"):
        desc = desc_meta["content"].strip()
    ogdesc = soup.find("meta", property="og:description")
    if ogdesc and ogdesc.get("content"):
        desc = ogdesc["content"].strip()
    if soup.html and soup.html.get("lang"):
        lang = soup.html.get("lang")
    link_canonical = soup.find("link", rel="canonical")
    if link_canonical and link_canonical.get("href"):
        canonical = safe_absolute_url(link_canonical["href"], base_url)
    return {"title": title, "description": desc, "language": lang or "", "canonical": canonical}

def _text(node):
    # return visible text inside node
    return " ".join([s.strip() for s in node.stripped_strings])

def parse_sections_from_html(html: str, base_url: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    sections = []

    # Prefer semantic landmarks
    landmark_tags = ["header", "nav", "main", "section", "footer", "article"]
    found = []
    for tag in landmark_tags:
        found.extend(soup.find_all(tag))

    # If none found, use top-level children of body
    if not found:
        body = soup.body
        if body:
            found = [child for child in body.find_all(recursive=False) if not isinstance(child, NavigableString)]
        else:
            found = [soup]  # fallback: whole doc

    # Limit number of sections to reasonable number (e.g., 30)
    max_sections = 30
    idx = 0
    for node in found:
        if idx >= max_sections:
            break
        try:
            inner_html = str(node)
            text = _text(node)
            # headings
            headings = [h.get_text(strip=True) for h in node.find_all(["h1", "h2", "h3"])]
            # links
            links = []
            for a in node.find_all("a", href=True):
                href = a.get("href").strip()
                if not href:
                    continue
                links.append({"text": (a.get_text(strip=True) or ""), "href": safe_absolute_url(href, base_url)})
            # images
            images = []
            for img in node.find_all("img"):
                src = img.get("src") or ""
                alt = img.get("alt") or ""
                if src:
                    images.append({"src": safe_absolute_url(src, base_url), "alt": alt})
            # lists
            lists = []
            for ul in node.find_all(["ul", "ol"]):
                items = [li.get_text(strip=True) for li in ul.find_all("li")]
                if items:
                    lists.append(items)
            # tables
            tables = []
            for table in node.find_all("table"):
                rows = []
                for tr in table.find_all("tr"):
                    cols = [c.get_text(strip=True) for c in tr.find_all(["th", "td"])]
                    if cols:
                        rows.append(cols)
                if rows:
                    tables.append(rows)

            # label
            if headings:
                label = headings[0]
            else:
                words = text.split()
                label = " ".join(words[:7]) if words else "Section"

            sec_type = derive_section_type(node, headings, text)
            raw_html = inner_html[:RAW_HTML_TRUNCATE]
            truncated = len(inner_html) > RAW_HTML_TRUNCATE
            section = {
                "id": make_id(label, idx),
                "type": sec_type,
                "label": label,
                "sourceUrl": base_url,
                "content": {
                    "headings": headings,
                    "text": text,
                    "links": links,
                    "images": images,
                    "lists": lists,
                    "tables": tables
                },
                "rawHtml": raw_html,
                "truncated": bool(truncated)
            }
            if text.strip() or images or links or lists or tables:
                sections.append(section)
                idx += 1
        except Exception:
            continue

    # Ensure we return at least one section
    if not sections:
        body_text = soup.body.get_text(" ", strip=True)[:500] if soup.body else soup.get_text(" ", strip=True)[:500]
        sections = [{
            "id": make_id("body", 0),
            "type": "unknown",
            "label": "Body",
            "sourceUrl": base_url,
            "content": {
                "headings": [],
                "text": body_text,
                "links": [],
                "images": [],
                "lists": [],
                "tables": []
            },
            "rawHtml": (str(soup.body) if soup.body else "")[:RAW_HTML_TRUNCATE],
            "truncated": False
        }]
    return sections

def derive_section_type(node, headings, text):
    tag = node.name if hasattr(node, "name") else ""
    cls = " ".join(node.get("class") or []).lower() if node and node.get("class") else ""
    id_ = (node.get("id") or "").lower() if node else ""
    if tag == "header" or "nav" in tag:
        return "nav"
    if tag == "footer":
        return "footer"
    if headings and len(headings) and (("hero" in cls) or ("hero" in id_)):
        return "hero"
    if node.find_all(["ul", "ol"]):
        return "list"
    return "section"

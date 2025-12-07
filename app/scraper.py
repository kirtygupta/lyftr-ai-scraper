# app/scraper.py
import httpx
from .parsers import parse_sections_from_html, extract_meta
from .utils import safe_absolute_url, now_iso
from typing import Dict, Any, List
import asyncio
import traceback

async def universal_scrape(url: str) -> Dict[str, Any]:
    result = {
        "url": url,
        "scrapedAt": now_iso(),
        "meta": {"title": "", "description": "", "language": "", "canonical": None},
        "sections": [],
        "interactions": {"clicks": [], "scrolls": 0, "pages": []},
        "errors": []
    }

    visited_pages: List[str] = []

    # --- 1) Static fetch attempt ---
    try:
        with httpx.Client(timeout=20, headers={"User-Agent": "lyftr-assignment-bot/1.0"}) as client:
            r = client.get(url, follow_redirects=True)
            base_url = str(r.url)
            visited_pages.append(base_url)
            result["interactions"]["pages"] = visited_pages.copy()
            html = r.text
            # Parse meta and sections
            try:
                meta = extract_meta(html, base_url)
                result["meta"].update(meta)
            except Exception as e:
                result["errors"].append({"message": f"Meta extraction failed: {str(e)}", "phase": "parse"})
            try:
                sections = parse_sections_from_html(html, base_url)
                result["sections"] = sections
            except Exception as e:
                result["errors"].append({"message": f"Static parsing failed: {str(e)}", "phase": "parse"})
    except Exception as e:
        result["errors"].append({"message": f"Static fetch failed: {str(e)}", "phase": "fetch"})

    # Heuristic: decide whether to fallback to JS
    try:
        total_text_length = sum(len(s.get("content", {}).get("text", "")) for s in result["sections"])
    except Exception:
        total_text_length = 0

    should_fallback = total_text_length < 400 or len(result["sections"]) < 2

    if should_fallback:
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                context = await browser.new_context(user_agent="lyftr-assignment-bot/1.0")
                page = await context.new_page()
                await page.goto(url, wait_until="networkidle", timeout=30000)
                result["interactions"]["pages"].append(page.url)
                clicks = []
                common_click_selectors = [
                    "button[role='tab']", "button[aria-controls]", "button:has-text('Load more')",
                    "button:has-text('Show more')", "a[rel='next']"
                ]
                for sel in common_click_selectors:
                    try:
                        els = await page.query_selector_all(sel)
                        if els:
                            try:
                                await els[0].click(timeout=3000)
                                clicks.append(sel)
                                await page.wait_for_timeout(800)
                            except Exception:
                                pass
                    except Exception:
                        pass

                result["interactions"]["clicks"].extend(clicks)

                scrolls = 0
                for i in range(3):
                    try:
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
                        await page.wait_for_timeout(1000 + i * 500)
                        scrolls += 1
                    except Exception:
                        break
                result["interactions"]["scrolls"] = max(result["interactions"]["scrolls"], scrolls)

                pages_seen = set(result["interactions"]["pages"])
                try:
                    for _ in range(2):
                        next_link = await page.query_selector("a[rel='next'], a:has-text('Next'), a:has-text('next')")
                        if next_link:
                            try:
                                href = await next_link.get_attribute("href")
                                if href:
                                    next_url = safe_absolute_url(href, page.url)
                                    await page.goto(next_url, wait_until="networkidle", timeout=20000)
                                    if page.url not in pages_seen:
                                        pages_seen.add(page.url)
                                        result["interactions"]["pages"].append(page.url)
                            except Exception:
                                break
                        else:
                            break
                except Exception:
                    pass

                rendered_html = await page.content()
                try:
                    meta = extract_meta(rendered_html, page.url)
                    result["meta"].update(meta)
                except Exception as e:
                    result["errors"].append({"message": f"Meta extraction after JS failed: {str(e)}", "phase": "parse"})
                try:
                    sections = parse_sections_from_html(rendered_html, page.url)
                    result["sections"] = sections
                except Exception as e:
                    result["errors"].append({"message": f"JS parse failed: {str(e)}", "phase": "parse"})

                await context.close()
                await browser.close()
        except Exception as e:
            tb = traceback.format_exc()
            result["errors"].append({"message": f"Playwright fallback failed: {str(e)}", "phase": "render"})
            result["errors"].append({"message": tb, "phase": "debug"})
    else:
        result["interactions"]["pages"] = result["interactions"].get("pages", visited_pages)

    if not result.get("sections"):
        result["errors"].append({"message": "No sections parsed", "phase": "parse"})

    result["scrapedAt"] = now_iso()
    return result

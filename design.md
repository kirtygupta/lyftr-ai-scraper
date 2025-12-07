
# Design Notes — Universal Website Scraper

This document explains the internal design philosophy, scraping pipeline, heuristics, interaction model, and architectural decisions behind the project.

---

# 1. Overview

The scraper follows a **static-first strategy** with **intelligent JS rendering fallback** using Playwright.  
This achieves the best balance between speed, reliability, and completeness.

The frontend is intentionally designed to visualize the JSON result in a human-readable format and help with debugging during evaluation.

---

# 2. Static-First Scraping Strategy

Static HTML is fetched using:

- `httpx` (faster than requests)
- `BeautifulSoup + lxml` (robust HTML parsing)

Static parsing is preferred because:

- It is faster (no browser needed)
- Many websites (Wikipedia, blogs, docs) work without JS
- It reduces resource usage and avoids unnecessary Playwright overhead

---

# 3. JS Fallback Heuristics (Playwright)

After static parsing, we evaluate:

- **Total extracted text length**  
- **Number of semantic sections found**

If:

- `total_text_length < 400`, **OR**  
- `< 2 sections found`  

→ Assume the site relies on **JavaScript** → Use **Playwright fallback**.

This ensures correctness without always launching a browser.

---

# 4. Playwright Interaction Model

Once Playwright loads the site:

### 4.1 Waiting Strategy
- `wait_until="networkidle"` after `goto()`
- Additional fixed waits after clicks
- Scroll waits increase exponentially to allow lazy-loading

### 4.2 Click Strategy
Automatically attempts:
- `button[role="tab"]`
- `button[aria-controls]`
- Buttons containing:  
  - **Load more**  
  - **Show more**
- Pagination:  
  - `a[rel="next"]`, "Next", "next"

### 4.3 Infinite Scroll Strategy
Performed **3 scrolls**, each deeper than the previous.

### 4.4 Pagination Strategy
Follows next-page link up to **depth 3**, recording:

- Pages visited
- URL transitions

---

# 5. Section Grouping Logic

Sections are grouped using a semantic-first approach:

1. Try HTML5 semantic containers:
   - `header`, `nav`, `main`, `section`, `footer`, `article`

2. If no semantic containers exist, use:
   - Direct `body > *` children

### 5.1 Label Derivation
A section label is chosen according to priority:

1. First `<h1>`, `<h2>`, or `<h3>`
2. Otherwise first **5–7 words** of text
3. Fallback → `"Section"`

### 5.2 Section Types
Heuristic assignment:

- `nav` → header / nav
- `hero` → if class/id contains "hero"
- `list` → contains `<ul>` or `<ol>`
- `footer` → tag is footer
- Default: `section`

---

# 6. Content Extraction Model

Each section contains:

- `headings`
- `text`
- `images`
- `links`
- `lists`
- `tables`
- `rawHtml` (truncated to 1000 chars)
- `truncated: true/false`

This is engineered to avoid overwhelming the UI while still preserving enough raw context.

---

# 7. Meta Extraction

The scraper collects:

- `title`
- `og:title`
- `description`
- `og:description`
- `html[lang]`
- canonical link

This is essential for SEO-friendly sites and correct metadata.

---

# 8. Interaction Tracking

Recorded automatically:

| Property | Meaning |
|---------|---------|
| `pages` | URLs visited during scraping |
| `clicks` | Which selectors were clicked |
| `scrolls` | Number of scroll operations |
| `scrapedAt` | UTC timestamp |

This greatly helps debugging JS-heavy websites.

---

# 9. Error Handling Philosophy

The scraper is **fault-tolerant**:

- Records errors inside the `errors[]` list
- Continues execution whenever possible
- Returns partial results instead of failing the entire request

This is required for unpredictable real-world websites.

---

# 10. Frontend Design Architecture

### 10.1 Goals:
- Attractive, modern, responsive
- Developer-friendly debugging tools
- Clear, collapsible visualization of sections

### 10.2 Framework Decisions:
- **TailwindCSS CDN** for zero-build rapid styling
- **Vanilla JS** for simplicity
- Card-based section visualization
- JSON actions:
  - Download JSON  
  - Copy JSON  
  - Copy section text  

### 10.3 Accessibility
- All buttons keyboard-navigable
- Inputs have proper labels
- High-contrast theme with dark background

---

# 11. Limitations & Future Work

### Not implemented (but possible):
- robots.txt enforcement
- Rate limiting
- Screenshot capture
- ML-based section classification
- Site-specific scraping rules

### Known limitations:
- Some infinite-scroll sites require more sophisticated loading checks
- Heavy single-page apps might require waiting for additional elements

---

# 12. Conclusion

This system provides a robust, scalable, production-grade scraping foundation that:

- Handles static and dynamic sites
- Provides rich structured output
- Includes a polished interface
- Matches all requirements of the Lyftr AI assignment

It balances correctness, performance, and engineering clarity — making it easy to extend and maintain.


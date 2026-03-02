---
marp: true
theme: default
paginate: true
style: |
  section {
    background: #111827;
    color: #f9fafb;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    padding: 64px 80px;
  }
  h1 {
    color: #f59e0b;
    font-size: 1.9em;
    border-bottom: 2px solid #292524;
    padding-bottom: 0.3em;
    margin-bottom: 0.7em;
  }
  strong { color: #f59e0b; }
  em { color: #9ca3af; font-style: normal; }
  ul { list-style: none; padding: 0; margin: 0; }
  li {
    margin-bottom: 0.75em;
    padding-left: 1.6em;
    position: relative;
    line-height: 1.5;
  }
  li::before {
    content: "→";
    color: #f59e0b;
    position: absolute;
    left: 0;
    font-weight: bold;
  }
  ol { padding-left: 1.4em; }
  ol li { padding-left: 0.5em; }
  ol li::before { display: none; }
  section::after { color: #374151; font-size: 0.75em; }
  section.title {
    background: #0c0a09;
    justify-content: center;
  }
  section.title h1 {
    font-size: 3em;
    border: none;
    margin-bottom: 0.2em;
    line-height: 1.1;
  }
  section.title p { color: #6b7280; font-size: 1em; margin-top: 0.4em; }
  section.title strong { color: #f9fafb; }
  section.end {
    background: #0c0a09;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  section.end h1 { border: none; font-size: 3.5em; }
---

<!-- _class: title -->

# Job Search Assistant

**A personal AI agent for the full job search pipeline**

*Nick Weisser · Claude + MCP + PostgreSQL*

---

# The Problem

- **Volume** — Dozens of listings to read, score, track, and follow up on
- **Every application is custom** — Fit evaluation, tailored cover letter, targeted interview prep. Can't recycle any of it.
- **Two tracks** — Applying to both dev and design roles with completely different criteria

---

# How It Works

![bg right:55% fit](./images/lake.png)

- **CLAUDE.md** — Full user profile, criteria, and dealbreakers as the system prompt
- **MCP: Postgres** — Persistent job tracker. Status, fit verdicts, rejection notes.
- **MCP: Firecrawl + Browser** — Paste a URL, agent scrapes it automatically
- **Subagents** — Dedicated prompts for scraping, cover letters, and interview prep

---

# Wins

![bg right:55% fit](./images/prep.png)

- **One URL → full evaluation** — Scrape, score fit, save to database. No manual entry.
- **Cover letters in seconds** — Pulls from the stored listing, knows your background, drafts something tailored
- **Interview prep on demand** — Company research, technical Qs, STAR answers, career-change talking points. Exported to a file.
- **Dual pipeline** — Separate logic for dev vs. design roles, same interface

---

<!-- _class: end -->

# Questions?

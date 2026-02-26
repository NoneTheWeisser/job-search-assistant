# Job Search Assistant — Demo Deck

> Source for 90–120 second demo slide deck. Each section = one slide. Use this markdown with Marp, Slidev, or copy into Google Slides/PowerPoint.

---

## Slide 1: Title

**Job Search Assistant**

*Nick Weisser*

---

## Slide 2: The Problem

Career changer. Bootcamp grad. Applying to both dev and design roles.

- **Cognitive overload** — Every listing: read it, score your fit, decide to apply, track status. Keeping dozens in your head doesn't scale.
- **Cover letters can't be recycled** — Each role needs a tailored pitch that connects *your* specific background (design + dev + management) to *their* requirements. That's research + writing + revision for every application.
- **Interview prep is multi-track** — Company research, technical Qs (varies by role), behavioral STAR answers, career-change talking points. Four different prep tasks, and you might have multiple interviews in a week.

---

## Slide 3: What It Does

**Paste a job URL** → Scrapes, evaluates fit, saves to tracker

**Strong Match / Partial Match / Not a Fit** — Based on your background and dealbreakers

**Draft outreach** — Tailored cover letters for any saved role

**Interview prep** — Company research, technical Qs, STAR answers, career-change talking points

---

## Slide 4: How It Works

- **Cursor** + AI agent (CLAUDE.md as the system prompt)
- **MCP** — Postgres for storage, Firecrawl for scraping job URLs
- **Subagents** — Dedicated prompts for scraping, cover letters, and interview prep
- **Dev + design** — Separate pipelines for full stack vs graphic design roles

---

## Slide 5: Example Flow

1. Paste a job listing URL
2. Agent scrapes it, evaluates fit, saves if it’s a match
3. “Help me write a cover letter for the FCCU role” → Draft in seconds
4. “Prep me for the interview” → Full prep sheet exported to `interview-prep/`

---

## Slide 6: End

**Questions?**

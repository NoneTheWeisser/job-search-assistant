# Demo Talking Points
*~90 seconds. Keep it conversational — slides are a backdrop, not a script.*

---

## Slide 1 — Title (5 sec)

> "This is a job search assistant I built using Claude as an AI agent. It automates the repetitive parts of job hunting — evaluating listings, writing cover letters, prepping for interviews."

---

## Slide 2 — The Problem (15 sec)

> "The core problem is that job searching doesn't scale well. You're reading dozens of listings, deciding if you're a fit, tracking statuses — and every single application needs custom work. I'm also applying to both dev and design roles, so I'm running two completely different sets of criteria at the same time."

---

## Slide 3 — How It Works (25 sec)

> "It's built around a file called CLAUDE.md — that's the system prompt, and it has my full background, target roles, tech stack, and dealbreakers baked in. From there it connects to two MCP servers: one for a Postgres database that tracks all my listings, and one for web scraping so I just paste a URL and it pulls the listing automatically. For bigger tasks like writing cover letters or building interview prep sheets, it spins up dedicated subagents with their own prompts."

---

## Slide 4 — Wins (30 sec)

> "The part I'm most happy with is how much of the workflow collapsed into a single step. Paste a URL, agent scrapes it, scores it against my profile, and either saves it or tells me why it's not a fit — no copy-pasting, no manual entry."

> "Cover letters used to take me 30-45 minutes each. Now I just say 'write a cover letter for the Lake Shirt role,' and it drafts something that actually references my background correctly."

> "Interview prep is probably the most useful output. It does company research, generates technical questions based on the role, writes STAR-format behavioral answers, and includes career-change talking points. All exported to a markdown file I can review the night before."

---

## Slide 5 — Questions (5 sec)

*Be ready for:*
- **"How does it handle bad scrapes?"** — Falls back to manual paste, or I can switch between browser MCP and Firecrawl
- **"Could this work for other people?"** — Yes, CLAUDE.md is just a config file. Swap in a different profile and it's a different user's assistant.
- **"What would you build next?"** — Automated job board monitoring, email draft integration, maybe a simple web UI

# Job Search Assistant

A Claude Code-powered job search tracker and career assistant built for a junior full stack developer entering the market.

## What It Does

- **Intake job listings** - Paste a URL and a scraper subagent fetches and extracts the listing data (or paste the text directly). Determines role type (dev or design) from title/description and routes to the right scraper
- **Evaluate fit** - Each listing gets scored against my background and criteria with a clear verdict: Strong Match, Partial Match, or Not a Fit
- **Smart saving** - Strong Matches auto-save to the database. Partial Matches ask for approval. Not a Fit gets discarded
- **Rejection tracking** - When I reject a Partial Match, the reason gets logged so the agent learns my preferences over time
- **Track applications** - Listings are saved to a PostgreSQL database with status tracking (new, reviewed, applied, interviewing, offer, rejected)
- **Query on demand** - Filter stored listings by status, verdict, or other criteria
- **Draft cover letters** - Dev roles use a junior developer cover letter subagent; design roles use a design-focused subagent. Both connect background to specific job requirements
- **Interview prep** - When you ask to prep for an interview, a subagent generates a tailored prep sheet: company research, technical questions (dev or design-focused), STAR-format behavioral answers, career change talking points, and questions to ask. Export goes to `interview-prep/`
- **Scrape job URLs** - Two scrapers: one for dev roles (tech stack extraction), one for design roles (tools/software extraction). Firecrawl MCP integration lets me paste a URL instead of copying the full listing text (works best with company career pages)

## Tech Stack

- **Claude Code** - AI agent that runs the whole workflow
- **PostgreSQL 17** - Stores job listings, evaluations, and status
- **MCP (Model Context Protocol)** - Connects Claude Code to Postgres (read) and Firecrawl (scrape)
- **psql** - Used for database writes (inserts/updates)
- **Firecrawl** - Scrapes job listing URLs to clean markdown (free tier, 500 credits)

## Project Structure

```
.
├── CLAUDE.md                # Agent instructions, user profile, and criteria
├── schema.sql               # Database schema (job_listings table)
├── prompts/
│   ├── cover-letter.md          # Cover letter subagent (dev roles)
│   ├── design-cover-letter.md   # Cover letter subagent (design roles)
│   ├── interview-prep.md        # Interview prep subagent (dev or design)
│   ├── job-scraper.md           # Job scraper subagent (dev roles)
│   └── design-job-scraper.md    # Job scraper subagent (design roles)
├── cover-letters/            # Exported cover letter drafts (gitignored)
├── interview-prep/           # Exported interview prep sheets (gitignored)
├── .mcp.json                 # MCP server config (gitignored, contains API keys)
├── .gitignore
└── README.md
```

## How It Works

1. **Paste a URL** into a Claude Code conversation
2. The agent detects whether the listing is a dev or design role from the title/description, then launches the appropriate scraper subagent. The scraper fetches the page via Firecrawl and returns structured data (keeps the main context lean)
3. The agent evaluates fit and applies verdict rules:
   - **Strong Match** → auto-saved to database
   - **Partial Match** → asks for your approval or rejection (with reason)
   - **Not a Fit** → discarded
4. Ask for a **cover letter** and a subagent drafts one using your background and the job details
5. Cover letters are exported to `cover-letters/` as markdown files
6. Ask to **prep for an interview** when you land one — a subagent generates a tailored prep sheet (company research, technical questions, STAR behavioral answers, career change talking points) and exports to `interview-prep/`
7. **Update status** as you progress through the application process

## Setup

1. Install [Postgres.app](https://postgresapp.com/) (PostgreSQL 17)
2. Create the database: `createdb job_assistant`
3. Run the schema: `psql -d job_assistant -f schema.sql`
4. Copy `.mcp.json.example` to `.mcp.json` and add your Firecrawl API key
5. Open the project in Claude Code

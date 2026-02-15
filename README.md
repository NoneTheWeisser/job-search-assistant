# Job Search Assistant

A Claude Code-powered job search tracker and career assistant built for a junior full stack developer entering the market.

## What It Does

- **Intake job listings** - Paste a URL and a scraper subagent fetches and extracts the listing data (or paste the text directly)
- **Evaluate fit** - Each listing gets scored against my background and criteria with a clear verdict: Strong Match, Partial Match, or Not a Fit
- **Smart saving** - Strong Matches auto-save to the database. Partial Matches ask for approval. Not a Fit gets discarded
- **Rejection tracking** - When I reject a Partial Match, the reason gets logged so the agent learns my preferences over time
- **Track applications** - Listings are saved to a PostgreSQL database with status tracking (new, reviewed, applied, interviewing, offer, rejected)
- **Query on demand** - Filter stored listings by status, verdict, or other criteria
- **Draft cover letters** - A dedicated subagent writes tailored, conversational cover letters that connect my background to specific job requirements
- **Scrape job URLs** - Firecrawl MCP integration lets me paste a URL instead of copying the full listing text (works best with company career pages)

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
│   ├── cover-letter.md      # Cover letter subagent prompt
│   └── job-scraper.md       # Job scraper subagent prompt
├── cover-letters/            # Exported cover letter drafts (gitignored)
├── .mcp.json                 # MCP server config (gitignored, contains API keys)
├── .gitignore
└── README.md
```

## How It Works

1. **Paste a URL** into a Claude Code conversation
2. The scraper subagent fetches the page via Firecrawl and returns structured data (keeps the main context lean)
3. The agent evaluates fit and applies verdict rules:
   - **Strong Match** → auto-saved to database
   - **Partial Match** → asks for your approval or rejection (with reason)
   - **Not a Fit** → discarded
4. Ask for a **cover letter** and a subagent drafts one using your background and the job details
5. Cover letters are exported to `cover-letters/` as markdown files
6. **Update status** as you progress through the application process

## Setup

1. Install [Postgres.app](https://postgresapp.com/) (PostgreSQL 17)
2. Create the database: `createdb job_assistant`
3. Run the schema: `psql -d job_assistant -f schema.sql`
4. Copy `.mcp.json.example` to `.mcp.json` and add your Firecrawl API key
5. Open the project in Claude Code

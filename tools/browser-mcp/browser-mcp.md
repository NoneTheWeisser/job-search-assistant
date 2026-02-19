# Browser MCP

Controls a Chrome browser via the Chrome DevTools Protocol (CDP). Lets Claude navigate to web pages, read their content, and interact with them — without using Firecrawl credits. Especially useful for JavaScript-heavy pages (SPAs, job boards like UltiPro, Workday, Greenhouse) that Firecrawl can't reliably scrape.

Chrome is launched automatically in headless mode on first use. No manual setup needed.

---

## Configuration

In `.mcp.json`:
```json
"browser": {
  "command": "node",
  "args": ["/Users/nweisser/projects/job-search-assistant/tools/browser-mcp/index.js"]
}
```

Claude Code loads it automatically on startup. No separate process to run.

---

## Tools

| Tool | What it does |
|---|---|
| `browser_navigate` | Navigates to a URL and waits for the page to load |
| `browser_screenshot` | Captures the current page as a PNG image |
| `browser_get_text` | Extracts visible text from the page or a specific element (pass a CSS selector to target, e.g. `"main"`, `".job-description"`) |
| `browser_scroll` | Scrolls the page — `"down"`, `"up"`, `"top"`, `"bottom"`. Accepts an `amount` in pixels (default 800) |
| `browser_click` | Clicks an element by CSS selector (useful for "Show more" buttons, cookie banners, etc.) |
| `browser_get_console_errors` | Returns buffered JS console errors since the last call, then clears the buffer |
| `dev_login` | Fills and submits a login form — useful for pages behind a login wall (LinkedIn, Workday portals, etc.) |

---

## Typical Workflow for a Job Listing

```
1. browser_navigate      →  go to the listing URL
2. browser_screenshot    →  visually confirm the page loaded
3. browser_get_text      →  pull the full listing text
4. browser_scroll        →  reveal below-fold content (if needed)
5. browser_get_text      →  capture the rest (if needed)
```

---

## Chrome Details

- **Binary:** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Debug port:** `9222`
- **User data dir:** `/tmp/chrome-debug-mcp`
- **Mode:** Headless (no visible window)

Chrome auto-launches on first tool call and stays running in the background. If it disconnects, the next call reconnects automatically.

---

## Scraping Priority

1. **Browser MCP first** — free, handles JS pages, no credit cost
2. **Firecrawl as fallback** — for cases where browser MCP falls short (free tier, 500 credits)
3. **User pastes listing text** — always an option if both fail

---

## Testing

Run the MCP Inspector for interactive testing:
```bash
npx @modelcontextprotocol/inspector node /Users/nweisser/projects/job-search-assistant/tools/browser-mcp/index.js
```

Opens a UI at `http://localhost:5173` where you can call tools manually and inspect raw JSON responses.

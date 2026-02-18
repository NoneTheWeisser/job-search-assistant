#!/usr/bin/env node
/**
 * Job Search Assistant — Browser MCP Server
 *
 * Controls Chrome via the Chrome DevTools Protocol (CDP) so Claude can
 * visually inspect and interact with job listing pages, company career
 * portals, and any web UI connected to this project.
 *
 * Chrome is launched automatically on first use (headless). You can also
 * pre-launch it manually:
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --remote-debugging-port=9222 --headless=new \
 *     --user-data-dir=/tmp/chrome-debug-mcp
 *
 * Add to .mcp.json:
 *   "browser": {
 *     "command": "node",
 *     "args": ["/path/to/tools/browser-mcp/index.js"]
 *   }
 */

import { spawn } from "child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import CDP from "chrome-remote-interface";

// ─── Prevent unhandled errors from crashing the MCP server process ────────────
// Without these, any unhandled rejection (e.g. in a CDP event listener) will
// kill the Node process and cause "Connection closed" on all subsequent calls.

process.on("uncaughtException", (err) => {
  process.stderr.write(`[browser-mcp] uncaughtException: ${err.stack ?? err.message}\n`);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[browser-mcp] unhandledRejection: ${reason}\n`);
});

// ─── Chrome connection ────────────────────────────────────────────────────────

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_PORT = 9222;
const CHROME_USER_DATA_DIR = "/tmp/chrome-debug-mcp";

let client = null;
let consoleErrors = [];

/**
 * Spawn Chrome headlessly with remote debugging and wait until the CDP port is
 * ready. Headless mode is required because the MCP server runs as a background
 * process with no display — without it Chrome can't open a window and never
 * binds the debugging port.
 */
async function launchChrome() {
  spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CHROME_PORT}`,
      `--user-data-dir=${CHROME_USER_DATA_DIR}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    { detached: true, stdio: "ignore" }
  ).unref();

  // Poll every 300 ms for up to 10 seconds
  for (let i = 0; i < 34; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      await CDP.List({ port: CHROME_PORT });
      return; // port is ready
    } catch {
      // not ready yet — keep waiting
    }
  }
  throw new Error("Chrome did not become ready within 10 seconds.");
}

async function getClient() {
  if (client) return client;

  // Try connecting; if Chrome isn't running, auto-launch it and retry once.
  try {
    client = await CDP({ port: CHROME_PORT });
  } catch {
    await launchChrome();
    try {
      client = await CDP({ port: CHROME_PORT });
    } catch {
      throw new Error(
        "Could not connect to Chrome on port 9222 after auto-launch.\n" +
          "Verify Chrome is installed at:\n  " + CHROME_PATH
      );
    }
  }

  // Enable the CDP domains we need.
  // Wrapped in try/catch so a bad connection resets client instead of leaving
  // a broken instance cached for future calls.
  try {
    await client.Network.enable();
    await client.Page.enable();
    await client.Runtime.enable();
    await client.DOM.enable();
  } catch (err) {
    try { client.close(); } catch { /* ignore */ }
    client = null;
    throw new Error(`Failed to enable CDP domains: ${err.message}`);
  }

  // Buffer JS errors and console.error calls
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    consoleErrors.push({
      timestamp: new Date().toISOString(),
      type: "uncaught",
      message: exceptionDetails.text || JSON.stringify(exceptionDetails),
      url: exceptionDetails.url,
      line: exceptionDetails.lineNumber,
    });
  });

  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type === "error") {
      consoleErrors.push({
        timestamp: new Date().toISOString(),
        type: "console.error",
        message: args.map((a) => a.value ?? a.description ?? "").join(" "),
      });
    }
  });

  // Reset on Chrome disconnect so the next call reconnects cleanly
  client.on("disconnect", () => {
    client = null;
  });

  return client;
}

/**
 * Navigate to a URL and wait for the page to load.
 * Uses Promise.race so we never hang on SPAs that don't fire loadEventFired.
 */
async function navigateAndWait(cdp, url, settleMs = 800, timeoutMs = 15_000) {
  const loadFired = new Promise((resolve) =>
    cdp.once("Page.loadEventFired", resolve)
  );
  const timedOut = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await cdp.Page.navigate({ url });
  await Promise.race([loadFired, timedOut]);
  await new Promise((r) => setTimeout(r, settleMs));
}

// ─── MCP server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: "job-search-browser-mcp", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "browser_screenshot",
      description:
        "Captures the current browser page as a PNG image (returned as base64). " +
        "Useful for visually verifying that a company career page scraped correctly, " +
        "confirming that a job listing's full description is visible, or documenting " +
        "the current browser state during a multi-step testing session. " +
        "Call browser_navigate first to ensure you are on the right page.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },

    {
      name: "browser_navigate",
      description:
        "Navigates Chrome to a URL and waits for the page to fully load before returning. " +
        "Useful for opening company career pages or job listings that Firecrawl cannot " +
        "reach — for example JavaScript-heavy SPAs, paginated job boards, or pages that " +
        "sit behind a login wall (call dev_login first in that case). " +
        "Always call this before taking a screenshot or running browser_get_console_errors.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "Full URL to navigate to (e.g., https://company.com/careers/12345).",
          },
        },
        required: ["url"],
      },
    },

    {
      name: "browser_get_console_errors",
      description:
        "Returns recent JavaScript console errors and uncaught exceptions that have been " +
        "buffered since the last call, then clears the buffer. " +
        "Useful for checking that a job listing page loaded without runtime errors, " +
        "verifying that a form submission on a job board worked correctly, or debugging " +
        "any web interface connected to the Job Search Assistant database. " +
        "Always call this after navigating to a new page or clicking a button.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },

    {
      name: "browser_click",
      description:
        'Clicks an element on the current page identified by a CSS selector. ' +
        'Useful for expanding "Show full job description" sections on listing pages, ' +
        "clicking pagination controls on job boards, dismissing cookie banners that " +
        "obscure content, or interacting with any UI element during a testing session. " +
        "Use browser_screenshot after clicking to visually confirm the result.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description:
              'CSS selector for the element to click (e.g., "button.show-more", "#load-more-jobs", ".cookie-dismiss").',
          },
        },
        required: ["selector"],
      },
    },

    {
      name: "browser_get_text",
      description:
        "Extracts the visible text content of the current page (or a specific element). " +
        "Use this to read job listing descriptions, requirements, and other page content " +
        "without needing to parse screenshots. Pass a CSS selector to target a specific " +
        "section, or omit it to get the full page text.",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description:
              "Optional CSS selector to extract text from a specific element " +
              '(e.g., ".job-description", "main"). Defaults to the full page body.',
          },
        },
        required: [],
      },
    },

    {
      name: "browser_scroll",
      description:
        "Scrolls the current page up, down, to the top, or to the bottom. " +
        "Use this to reveal content below the fold before calling browser_get_text " +
        "or browser_screenshot.",
      inputSchema: {
        type: "object",
        properties: {
          direction: {
            type: "string",
            enum: ["down", "up", "bottom", "top"],
            description:
              '"down" / "up" scroll by a fixed amount (default 800px). ' +
              '"bottom" / "top" jump to the end or start of the page.',
          },
          amount: {
            type: "number",
            description:
              "Pixels to scroll when direction is 'down' or 'up'. Defaults to 800.",
          },
        },
        required: ["direction"],
      },
    },

    {
      name: "dev_login",
      description:
        "Navigates to a login page, fills in credentials using native input events " +
        "(compatible with React/Vue controlled inputs), submits the form, and waits " +
        "for the post-login redirect. " +
        "Useful for accessing job boards like LinkedIn or Indeed that require an account " +
        "before full listings are visible — working around Firecrawl's limitation on " +
        "authenticated pages. Also useful for logging into company applicant-tracking " +
        "portals (Workday, Greenhouse, Lever) to reach job listing detail pages. " +
        "Call this before using browser_navigate to scrape any page behind a login wall. " +
        "Pass successUrlPattern (e.g. '/feed', '/dashboard') to verify login succeeded.",
      inputSchema: {
        type: "object",
        properties: {
          loginUrl: {
            type: "string",
            description:
              "Full URL of the login page (e.g., https://www.linkedin.com/login).",
          },
          email: {
            type: "string",
            description: "Email address or username for the account.",
          },
          password: {
            type: "string",
            description: "Password for the account.",
          },
          successUrlPattern: {
            type: "string",
            description:
              "Optional substring expected in the URL after a successful login " +
              "(e.g., '/feed' for LinkedIn). Used to confirm authentication succeeded.",
          },
        },
        required: ["loginUrl", "email", "password"],
      },
    },
  ],
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  let cdp;
  try {
    cdp = await getClient();
  } catch (err) {
    return {
      content: [{ type: "text", text: `Chrome connection error: ${err.message}` }],
      isError: true,
    };
  }

  try {
    switch (name) {
      // ── browser_screenshot ──────────────────────────────────────────────────
      case "browser_screenshot": {
        const { data } = await cdp.Page.captureScreenshot({ format: "png" });
        return {
          content: [{ type: "image", data, mimeType: "image/png" }],
        };
      }

      // ── browser_navigate ────────────────────────────────────────────────────
      case "browser_navigate": {
        const { url } = args;
        await navigateAndWait(cdp, url);
        return {
          content: [{ type: "text", text: `Navigated to: ${url}` }],
        };
      }

      // ── browser_get_console_errors ──────────────────────────────────────────
      case "browser_get_console_errors": {
        const errors = [...consoleErrors];
        consoleErrors = [];

        if (errors.length === 0) {
          return {
            content: [{ type: "text", text: "No console errors detected." }],
          };
        }

        const lines = errors.map(
          (e) =>
            `[${e.timestamp}] ${e.type}: ${e.message}` +
            (e.url ? ` @ ${e.url}:${e.line}` : "")
        );

        return {
          content: [
            {
              type: "text",
              text: `${errors.length} error(s) found:\n\n${lines.join("\n")}`,
            },
          ],
        };
      }

      // ── browser_click ───────────────────────────────────────────────────────
      case "browser_click": {
        const { selector } = args;

        const { result } = await cdp.Runtime.evaluate({
          expression: `
            (function () {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return { found: false };
              el.click();
              return {
                found: true,
                tag: el.tagName.toLowerCase(),
                text: el.textContent.trim().slice(0, 120),
              };
            })()
          `,
          returnByValue: true,
        });

        if (!result.value?.found) {
          return {
            content: [
              { type: "text", text: `No element found for selector: ${selector}` },
            ],
            isError: true,
          };
        }

        // Allow time for any navigation or async re-render triggered by the click
        await new Promise((r) => setTimeout(r, 600));

        const { tag, text } = result.value;
        return {
          content: [
            {
              type: "text",
              text: `Clicked <${tag}> "${text}" (selector: "${selector}")`,
            },
          ],
        };
      }

      // ── browser_get_text ────────────────────────────────────────────────────
      case "browser_get_text": {
        const selector = args.selector || "body";

        const { result } = await cdp.Runtime.evaluate({
          expression: `
            (function () {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) return { found: false };
              return { found: true, text: el.innerText };
            })()
          `,
          returnByValue: true,
        });

        if (!result.value?.found) {
          return {
            content: [
              { type: "text", text: `No element found for selector: ${selector}` },
            ],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: result.value.text }],
        };
      }

      // ── browser_scroll ──────────────────────────────────────────────────────
      case "browser_scroll": {
        const { direction, amount = 800 } = args;

        const expression = direction === "top"
          ? "window.scrollTo(0, 0);"
          : direction === "bottom"
          ? "window.scrollTo(0, document.body.scrollHeight);"
          : direction === "up"
          ? `window.scrollBy(0, -${amount});`
          : `window.scrollBy(0, ${amount});`;

        await cdp.Runtime.evaluate({ expression });
        await new Promise((r) => setTimeout(r, 300));

        const { result: posResult } = await cdp.Runtime.evaluate({
          expression: "Math.round(window.scrollY)",
          returnByValue: true,
        });

        return {
          content: [
            {
              type: "text",
              text: `Scrolled ${direction}. Current scroll position: ${posResult.value}px from top.`,
            },
          ],
        };
      }

      // ── dev_login ───────────────────────────────────────────────────────────
      case "dev_login": {
        const { loginUrl, email, password, successUrlPattern } = args;

        // 1. Navigate to the login page
        await navigateAndWait(cdp, loginUrl, 500);

        // 2. Fill credentials using native value setters so React/Vue
        //    controlled inputs register the change events correctly
        const { result: fillResult } = await cdp.Runtime.evaluate({
          expression: `
            (function () {
              const emailSel = [
                'input[type="email"]',
                'input[name="email"]',
                'input[name="username"]',
                'input[id*="email"]',
                'input[id*="user"]',
                'input[type="text"]',
              ].join(", ");
              const emailEl = document.querySelector(emailSel);
              const passEl  = document.querySelector('input[type="password"]');

              if (!emailEl || !passEl) {
                return { ok: false, reason: "login form inputs not found on page" };
              }

              // Use the native setter so React synthetic events fire correctly
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, "value"
              ).set;

              const fill = (el, val) => {
                nativeSetter.call(el, val);
                el.dispatchEvent(new Event("input",  { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
              };

              fill(emailEl, ${JSON.stringify(email)});
              fill(passEl,  ${JSON.stringify(password)});
              return { ok: true };
            })()
          `,
          returnByValue: true,
        });

        if (!fillResult.value?.ok) {
          return {
            content: [
              {
                type: "text",
                text: `Login failed: ${fillResult.value?.reason}`,
              },
            ],
            isError: true,
          };
        }

        // 3. Submit the form
        await cdp.Runtime.evaluate({
          expression: `
            (function () {
              const btn = document.querySelector(
                'button[type="submit"], input[type="submit"], form button'
              );
              if (btn) { btn.click(); return "submit button clicked"; }
              const form = document.querySelector("form");
              if (form) { form.submit(); return "form.submit() called"; }
              return "no submit target found";
            })()
          `,
          returnByValue: true,
        });

        // 4. Wait for the post-login redirect to settle
        await new Promise((r) => setTimeout(r, 1800));

        const { result: urlResult } = await cdp.Runtime.evaluate({
          expression: "window.location.href",
          returnByValue: true,
        });

        const currentUrl = urlResult.value;
        const loginSucceeded =
          !successUrlPattern || currentUrl.includes(successUrlPattern);

        return {
          content: [
            {
              type: "text",
              text:
                (loginSucceeded ? "Login succeeded." : "Login may have failed.") +
                `\nCurrent URL: ${currentUrl}`,
            },
          ],
          isError: !loginSucceeded,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Tool error in ${name}: ${err.message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

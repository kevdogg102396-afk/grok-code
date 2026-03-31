# Grok-Code by ClawdWorks

**The most capable autonomous AI agent for Grok. One command. Full power.**

Grok-Code turns xAI's Grok models into a fully autonomous coding agent with real tools — file editing, bash execution, web browsing, MCP server integration, persistent memory, and Telegram access. Not a chatbot wrapper. A real agent that can read, write, execute, and iterate on your entire codebase.

**Grok 4.1 Fast** brings a 2M token context window at $0.20/M input — the cheapest frontier-class agent on the market.

### Install (one command)

**Mac / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.ps1 | iex
```

Then just run:
```
grok-code
```

---

## What Makes This Different

Most "Grok wrappers" are chat interfaces. Grok-Code is an **autonomous agent** — it doesn't just answer questions, it takes action.

| Feature | Grok-Code | ChatGPT / Grok Web | Other CLI tools |
|---------|-----------|---------------------|-----------------|
| Read & write files | Yes | No | Some |
| Execute bash/Python | Yes | No | Some |
| MCP server integration | Yes | No | No |
| Docker sandboxing | Yes | No | No |
| Telegram bot mode | Yes | No | No |
| Mid-session model switching | Yes | No | No |
| Persistent memory | Yes | No | No |
| One-command install (all platforms) | Yes | N/A | Rarely |
| No Python dependency | Yes | N/A | No (most need Python) |
| 2M token context | Yes | Limited | Varies |

### Grok's Unique Powers
Grok models are trained on real-time X (Twitter) data and have access to **Live Search** — real-time web + X post search, trending topics, and current events. No other AI agent framework gives you this:

- **Real-time X/Twitter intelligence** — search posts, trends, and conversations
- **Live web search** — up-to-date information beyond the training cutoff
- **Lowest hallucination rate** — Grok 4 models are benchmarked for strict factual accuracy
- **Native tool calling** — Grok models are optimized for agentic workflows
- **Minimal censorship** — Grok actually does what you ask. Post to X, Facebook, automate social media, generate content other models refuse to touch. Pair with Playwright MCP and Grok becomes your uncensored automation engine across any platform

---

## Models

Switch models anytime during a session. Three tiers for different needs:

| Model | Context | Cost (in/out per 1M) | Best for |
|-------|---------|------|----------|
| **Grok 4.1 Fast** (default) | 2M tokens | $0.20 / $0.50 | Fast coding, massive context, daily driver |
| **Grok 4** | 256K tokens | $3.00 / $15.00 | Complex reasoning, architecture decisions |
| **Grok 3 Mini** | 131K tokens | $0.30 / $0.50 | Budget tasks, quick questions |

Most coding sessions cost **less than $0.01** on Grok 4.1 Fast.

---

## Capabilities

**Code & Files**
- Generate, edit, and debug code in any language
- Read and write files across your entire project
- Run scripts (Python, Node.js, Bash, anything)
- Git operations (commit, branch, diff, log)

**Automation & Integration**
- MCP server support — Playwright, GitHub, Slack, Notion, databases, anything
- Browser automation via Playwright MCP — post to X, scrape sites, fill forms, automate workflows
- Telegram bot mode — manage your agent from your phone
- Docker sandboxing — safe execution in isolated containers
- Persistent conversation memory across sessions

**Research & Intelligence**
- Web fetching and browsing
- Real-time data via Grok's Live Search
- X/Twitter trend analysis and post search
- Full browser control — navigate, screenshot, interact with any web app

---

## Install Modes

### Docker (sandboxed) — recommended
Runs in a secure container. The AI can't access your host machine. Safe for untrusted tasks, experiments, or anything you want fully isolated.

### Local (full power)
Full machine access — filesystem, browser, MCP servers, git, everything. Maximum capability for trusted workflows.

---

## Telegram Bridge

Deploy Grok-Code as a persistent Telegram bot — your AI agent in your pocket, 24/7:

```bash
TELEGRAM_BOT_TOKEN=xxx grok-code telegram
```

Commands:
- `/grok4fast` — Switch to Grok 4.1 Fast (default)
- `/grok4` — Switch to Grok 4 (full power)
- `/grok3mini` — Switch to Grok 3 Mini (budget)
- `/models` — Show current model

Conversation history persists across reboots when using Docker volume mounts.

---

## Requirements

- **Node.js** 18+ (both modes)
- **Docker** (sandboxed mode only)
- **xAI API key** — get one at [console.x.ai](https://console.x.ai)

**No Python. No pip. No LiteLLM.** Just Node.js and your xAI key. The lightest autonomous agent install on the market.

---

## Architecture

```
You → Grok-Code CLI → Node.js Proxy → xAI API (Grok models)
```

The custom Node.js proxy translates API formats with zero external dependencies. No bloated middleware, no Python runtime, no package conflicts. Start to agent in under 5 seconds.

---

## License & Legal

The Grok-Code wrapper (proxy, splash screen, install scripts, Telegram bridge) is licensed under Apache 2.0 — see [LICENSE](LICENSE).

**Important:** Grok-Code requires the Claude Code CLI (`@anthropic-ai/claude-code`), which is proprietary software by Anthropic PBC. Your use of the Claude Code CLI is subject to [Anthropic's terms](https://www.anthropic.com/legal/commercial-terms). Grok-Code does not modify the CLI binary — it routes API calls through a custom proxy to xAI's Grok models.

**Not affiliated with Anthropic or xAI.** Grok-Code is an independent project by ClawdWorks. "Claude Code" is a trademark of Anthropic PBC. "Grok" is a trademark of xAI Corp.

Built by [ClawdWorks](https://kevdogg102396-afk.github.io/clawdworks-site/).

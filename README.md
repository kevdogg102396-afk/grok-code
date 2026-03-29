# Grok-Code by ClawdWorks

**AI coding agent powered by xAI's Grok models. One command install.**

Grok-Code gives you a full AI coding agent — file editing, bash, MCP servers, autocompact — powered by xAI's Grok models. Grok 4.1 Fast has a 2M token context window at $0.20 per million input tokens.

### Mac / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.ps1 | iex
```

Then:
```
grok-code
```

---

## Models

Switch models anytime during a session:

| Model | Context | Cost (in/out per 1M) | Best for |
|-------|---------|------|----------|
| **Grok 4.1 Fast** (default) | 2M tokens | $0.20 / $0.50 | Fast coding, huge context |
| **Grok 4** | 256K tokens | $3.00 / $15.00 | Complex reasoning |
| **Grok 3 Mini** | 131K tokens | $0.30 / $0.50 | Budget, quick tasks |

---

## Install Modes

### Docker (sandboxed) — recommended
Runs in a secure container. Can't access your files. Safe for anything.

### Local (full power)
Full machine access — filesystem, browser, MCP servers, everything.

---

## Requirements

- **Node.js** 18+ (both modes)
- **Docker** (sandboxed mode only)
- **xAI API key** — get one at [console.x.ai](https://console.x.ai)

No Python required. No LiteLLM. Just Node.js.

---

## Telegram Bridge

Run Grok-Code as a Telegram bot:

```bash
TELEGRAM_BOT_TOKEN=xxx grok-code telegram
```

Commands in Telegram:
- `/grok4fast` — Switch to Grok 4.1 Fast
- `/grok4` — Switch to Grok 4
- `/grok3mini` — Switch to Grok 3 Mini
- `/models` — Show current model

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built by [ClawdWorks](https://kevdogg102396-afk.github.io/clawdworks-site/).

# Grok-Code v2.0.0

> **An autonomous coding agent that actually uses tools, edits files, runs commands, and finishes the job.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f471b6)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6)](https://www.typescriptlang.org)

Grok-Code is not a chatbot wrapper. It's a **real coding agent**: it reads your files, writes code, runs bash, searches the web, plugs into MCP servers, and works through tasks end-to-end instead of stopping at suggestions.

**Why people try it:**
- Actually edits the codebase instead of just talking about it
- Runs commands, tests, and debugging steps on your machine
- Handles big repos with Grok Fast's 2M-token context window
- Keeps memory across sessions so it gets less forgetful over time
- Ships as a single CLI with no Python, Docker, or runtime mess

```
You → grok-code → reads files → writes code → runs commands → verifies changes
```

If you want Claude Code / Codex-style workflow with Grok models and more autonomy, this is that.

---

## Install (1 minute)

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/master/install/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/master/install/install.ps1 | iex
```

**Requirements:**
- xAI API key ([get one free at console.x.ai](https://console.x.ai))
- That's it. No Python, no pip, no Docker requirement.

Then run:
```bash
grok
```

---

## Quick Start

```bash
grok                           # Auto mode: asks before bigger actions
grok --yolo                    # Full send: minimal friction, maximum momentum
grok --sandbox                 # Stay locked to the current folder
grok --yolo --sandbox          # Fast and contained
grok --model fast              # Cheapest daily-driver model
grok --model reason            # Deep thinking for hard problems
grok --no-splash               # Skip the intro animation
```

## Watch It Run

**32-second demo:** prompt → Grok writes code → launches the page → result is live.

[![Watch Grok-Code build and launch a landing page in 32 seconds](https://img.youtube.com/vi/pnEvQ4LAfoM/maxresdefault.jpg)](https://www.youtube.com/watch?v=pnEvQ4LAfoM)

If you want a looping teaser for socials or docs, the first ~4 seconds are the money shot: typing `grok` in the terminal and the splash screen kicking in.

### 30-second demo prompts

```text
> find the failing test and fix it
> add a dark mode toggle to this app and make it look good
> refactor this file into smaller modules without breaking imports
> audit this repo for security issues and patch the obvious ones
```

---

## What Makes Grok-Code Different

Most CLI tools feel like chat in a trench coat. Grok-Code is an **autonomous agent with real tools**.

| Feature | Grok-Code | Other CLI Agents |
|---------|-----------|------------------|
| File read/write | Yes | Some |
| Bash execution | Yes | Some |
| Web search + fetch | Yes | Some |
| MCP server integration | Yes | Rarely |
| Model switching mid-session | Yes | No |
| Persistent memory across sessions | Yes | No |
| Sub-agent dispatch | Yes | No |
| Skills system (.md files) | Yes | No |
| Single binary, no runtime deps | Yes | No |
| 2M token context window | Yes | No |

**Why it hits different:**
- Real-time X/Twitter integration for live search and current context
- Agentic-first model behavior tuned for tool use
- High-context workflows without constantly losing the plot
- Strong autonomy for builders who want action, not hand-holding

---

## Features

### Core Tooling (14 tools)
- **bash** — execute shell commands, scripts, git operations
- **read** — load files (respects .gitignore and binary detection)
- **write** — create/overwrite files
- **edit** — surgical edits (find-replace, line ranges)
- **multi_edit** — edit multiple files in one request
- **glob** — find files by pattern
- **grep** — search file contents with regex
- **web_fetch** — download and parse HTML/JSON
- **web_search** — live web search (via Grok's Live Search)
- **todo** — persistent task tracking (completed/pending/in-progress)
- **think** — extended reasoning (CoT, planning, analysis)
- **notebook** — Jupyter notebook editing (code + markdown cells)
- **memory** — persistent session memory (auto-persists to ~/.grok-code/memory/)
- **subagent** — dispatch tasks to different Grok models

### Companion System
Pick a personality on first launch. They hang out in the status bar:
- **Zyx** (alien) — curious, asks questions, explores possibilities
- **Bolt** (robot) — direct, efficient, task-focused
- **Meni** (cat) — casual, sarcastic, does things on their own terms
- **Goop** (blob) — chaotic, experimental, "let's try it and see"

Each has a unique pixel-art animation and voice in error messages.

### Permission Modes
- **auto** (default) — asks before shell execution, writes to new files, web searches
- **manual** — asks before *any* action (careful mode)
- **yolo** — execute everything without prompts (for scripts, automation, trusted tasks)
- **sandbox** — toggle lock to current folder (prevents access outside project directory)

### Model Switching (mid-session)
```
/model fast      # Grok 4.20 Fast (2M ctx, $0.20/M, daily driver)
/model reason    # Grok 4.20 Reason (256K ctx, $3.00/M, deep thinking)
/model standard  # Grok 4.20 (256K ctx, $5.00/M, general purpose)
```

Switch anytime. Session context carries over.

### Project Auto-Config
On startup, Grok-Code checks for `GROK.md` or `CLAUDE.md` in the project root and auto-loads project context. Use it to:
- Define the codebase scope
- Set role/constraints (e.g., "you're the backend guy, don't touch frontend")
- Inject project memory (API keys, architecture decisions, past decisions)
- Set custom personality

Example `GROK.md`:
```markdown
# Project Context

You are the lead developer on a Next.js + Supabase project.

## Scope
- /app: Next.js routes
- /lib: utilities, queries
- /public: static assets
(Don't touch: /node_modules, /.next, /migrations)

## Personality
Use Zyx (curious). Ask questions before big changes.

## Memory
- Supabase project: project_ref_xyz
- Deploy: Vercel (auto on main branch)
- DB migrations run with: `npm run migrate`
```

---

## Models

All three models can use Grok's Live Search for real-time data.

| Model | Context | Cost (in/out per 1M) | Speed | Best for |
|-------|---------|-----|------|----------|
| **Grok 4.20 Fast** (default) | 2M tokens | $0.20 / $0.50 | ⚡ Very fast | Massive repos, everyday coding, cheap iterations |
| **Grok 4.20 Reason** | 256K tokens | $1.00 / $5.00 | 🤔 Deliberate | Complex debugging, architecture, planning |
| **Grok 4.20 Standard** | 256K tokens | $5.00 / $15.00 | 🚀 Fast | General-purpose work, balanced performance |

**Typical cost:** Most coding sessions on Grok Fast are tiny.

---

## Usage Examples

### Generate a new feature
```bash
grok
> I need a React component that fetches data from an API and displays it with pagination.
```
Grok-Code will:
1. Ask where to create the file
2. Generate the component
3. Add TypeScript types
4. Include error handling and loading states
5. Test if it compiles

### Debug a failing test
```bash
grok --yolo
> Why is this test failing? It should pass on lines 45-67 of tests/auth.test.ts
```
Grok-Code will:
1. Read the test file
2. Check the implementation
3. Run the test to see the actual error
4. Propose a fix
5. Apply it

### Refactor a large file
```bash
grok --sandbox
> This file is 400 lines. Break it into smaller modules. Keep the public API the same.
```
Grok-Code will:
1. Analyze the code
2. Propose a structure
3. Create new files
4. Run tests to ensure nothing broke
5. Report what changed

### Search the web & integrate findings
```bash
grok
> What's the latest guidance on securing Next.js API routes? Implement it in my project.
```
Grok-Code will:
1. Search for current best practices
2. Read your current implementation
3. Compare and propose updates
4. Apply security improvements

---

## Slash Commands

```
/help              Show all commands
/model [fast|reason|standard]    Switch models
/models            Show current model + available models
/mode [auto|manual|yolo]         Change permission mode
/companion [zyx|bolt|meni|goop]  Change personality
/about             Info about Grok-Code
/activate          Show activation status and options
/stats             Token usage this session
/reset             Clear session memory (keep files)
/quit              Exit
```

---

## Permission Modes Explained

### Auto (default)
Asks for permission before:
- Executing bash commands (except safe ones like `ls`, `pwd`, `git status`)
- Writing to new files (not editing existing ones)
- Web searches
- Subagent dispatch

Doesn't ask for:
- Reading files
- Grep/glob queries
- Thinking/planning
- Memory operations

### Manual
Asks before *any* action except reading. Safest mode.

### YOLO
Execute everything without asking. Great for:
- Scheduled tasks (cron jobs that run grok)
- Automation scripts
- Trusted environments
- Rapid prototyping

Pair with `--sandbox` to lock it to a folder.

### Sandbox
Restricts file operations to the current directory and children. Prevents:
- Reading/writing files outside the project
- Executing commands that could escape the directory

---

## MCP Server Integration

Grok-Code supports any MCP server that works with Claude Code. Drop your MCP config in `~/.grok-code/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    }
  }
}
```

Popular MCP servers:
- **Playwright** — browser automation, web scraping, form filling
- **GitHub** — read/write repos, PRs, issues
- **Slack** — send messages, read channels
- **Notion** — read/write databases, pages
- **Stripe** — query transactions, manage subscriptions
- Custom servers — write your own in TypeScript/Python

---

## Skills System

Create reusable tasks as `.md` files in `~/.grok-code/skills/`.

Example: `~/.grok-code/skills/write-test.md`
```markdown
# Write Unit Test

Write a test for the function in {file} using {framework}.

## Constraints
- 80%+ code coverage
- Use describe/it blocks
- Mock external calls
```

Then invoke:
```bash
grok
> /write-test util/auth.ts jest
```

Grok-Code will:
1. Read the skill definition
2. Substitute variables
3. Execute the task
4. Save the test

---

## Sub-Agent Dispatch

Send specialized tasks to different models. Example:

```
/subagent reason "Design the database schema for a multi-tenant SaaS app"
/subagent fast "Write the migration file for the schema above"
/subagent reason "Plan how to handle data isolation in queries"
```

Each subagent:
- Gets the full context and memory
- Runs independently
- Reports back
- Contributes to the shared memory

Great for:
- Complex planning (use Reason for thinking)
- Cost optimization (use Fast for execution)
- Parallel work (multiple subagents at once)

---

## Project Files

### GROK.md
Optional project-level config. Grok-Code auto-reads this on startup.

```markdown
# Grok-Code Config

## Role
Lead backend engineer on a Node.js + Supabase project.

## Scope
- /src: all code
- /migrations: SQL migrations
(Ignore: /node_modules, /dist)

## Constraints
- Never run migrations without explicit approval
- Always run tests before writing code
- Use TypeScript, no JavaScript

## Memory
DB_URL=postgres://...
SUPABASE_KEY=...
```

### ~/.grok-code/memory/
Session memory persists across runs. Grok-Code auto-reads this on startup and updates it after each session.

Example structure:
```
memory/
  session-001.md       # First session
  session-002.md       # Second session
  current-task.md      # What we're working on
  decisions.md         # Decisions made
```

---

## Configuration

### API Key
```bash
export XAI_API_KEY="xk_..."
grok
```

Or save to `~/.grok-code/.env`:
```
XAI_API_KEY=xk_...
```

### Companion
```bash
grok --companion meni
```

Or save default in `~/.grok-code/config.json`:
```json
{
  "companion": "meni",
  "defaultMode": "auto",
  "defaultModel": "fast"
}
```

### MCP Servers
Grok-Code looks for `mcp.json` in:
1. `./mcp.json` (project root)
2. `~/.grok-code/mcp.json` (user default)
3. `~/.claude/mcp.json` (Claude Code legacy)

---

## Activation

Grok-Code works out of the box with core tools, permission modes, MCP integration, model switching, and persistent memory.

Some environments may also support optional activation for expanded access to advanced capabilities.

To check your current status, run:

```bash
/activate
```

---

## Tech Stack

- **Bun** — fast TypeScript runtime
- **TypeScript** — fully typed
- **React + Ink** — beautiful terminal UI
- **xAI Grok API** — (OpenAI-compatible)

No dependencies on:
- Python
- Node.js (Bun is self-contained)
- Docker (optional, not required)
- Claude Code (standalone)

---

## Troubleshooting

**"Command not found: grok"**
Make sure the install script ran successfully:
```bash
echo $PATH | grep grok-code
```

If missing, add to ~/.bashrc or ~/.zshrc:
```bash
export PATH="$HOME/.grok-code/bin:$PATH"
```

**"Invalid API key"**
Check your xAI key:
```bash
echo $XAI_API_KEY
```

Get one at [console.x.ai](https://console.x.ai).

**"Out of context"**
You've hit the 2M token limit on Grok Fast. Switch models:
```
/model reason
```

Or start a new session (context resets but memory persists).

**Something broke, I want to reset**
```bash
grok
> /reset
```

Clears session memory but keeps files and configs.

---

## Contributing

Grok-Code is open source. Found a bug? Have an idea?

- **Issues:** [GitHub Issues](https://github.com/kevdogg102396-afk/grok-code/issues)
- **Discussions:** [GitHub Discussions](https://github.com/kevdogg102396-afk/grok-code/discussions)
- **PRs:** We review all pull requests

---

## License

Grok-Code v2 is licensed under **Apache 2.0**. See [LICENSE](LICENSE).

---

## Built By

[ClawdWorks](https://github.com/kevdogg102396-afk/grok-code) — building sharp, useful AI agents for real work.

---

## What's Next

- **v2.1** — Custom tool builder (write your own tools in .md)
- **v2.2** — Filesystem watchers (monitor changes, auto-respond)
- **v2.3** — Scheduled tasks (cron-like automation)
- **v2.4** — Team mode (multiple agents, shared memory, voting)

---

**Questions?** Reach out on [X/Twitter](https://twitter.com) or [GitHub Discussions](https://github.com/kevdogg102396-afk/grok-code/discussions).

## Bottom Line

If you want an AI coding tool that actually uses your filesystem, shell, web, and MCP stack instead of just generating nice-sounding advice, run:

```bash
grok
```

#!/usr/bin/env bun
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Provider } from '../src/provider/provider.js';
import { Agent } from '../src/core/agent.js';
import '../src/tools/index.js';
import { startRepl } from '../src/ui/repl.js';
import { loadMCPServers } from '../src/mcp/loader.js';
import { loadSkills, getSkillsContext, ensureSkillsDirs } from '../src/core/skills.js';
import { SubAgentManager } from '../src/core/subagent.js';
import { setSubAgentManager } from '../src/tools/subagent-tool.js';
import { Permissions } from '../src/permissions/permissions.js';
import { loadConfig, setConfigValue } from '../src/core/config.js';

// Load saved config
const savedConfig = loadConfig();

// Parse args — CLI flags override saved config
const args = process.argv.slice(2);
let modelArg = 'grok-4.20';
let skipSplash = false;
let modeFromCli = false;
let sandboxFromCli = false;

// Determine initial mode: CLI flag > startMode setting > saved last mode > auto
let initialMode: 'manual' | 'auto' | 'yolo' = 'auto';
if (savedConfig.startMode === 'last' && savedConfig.lastMode) {
  initialMode = savedConfig.lastMode;
} else if (savedConfig.startMode && savedConfig.startMode !== 'last') {
  initialMode = savedConfig.startMode;
}
let initialSandbox = savedConfig.startMode === 'last' ? (savedConfig.lastSandbox || false) : false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) {
    modelArg = args[i + 1];
    i++;
  }
  if (args[i] === '--no-splash') skipSplash = true;
  if (args[i] === '--yolo') { initialMode = 'yolo'; modeFromCli = true; }
  if (args[i] === '--manual') { initialMode = 'manual'; modeFromCli = true; }
  if (args[i] === '--auto') { initialMode = 'auto'; modeFromCli = true; }
  if (args[i] === '--sandbox') { initialSandbox = true; sandboxFromCli = true; }
  if (args[i] === '--help') {
    console.log(`
GROK CODE v2.0.0 — AI Coding Agent by ClawdWorks

Usage: grok-code [options]

Options:
  --model <alias>   Model: standard, fast, reason (default: standard)
  --yolo            YOLO mode — no permission prompts, full send
  --manual          Manual mode — confirms every action
  --auto            Auto mode — safe actions auto, dangerous asks (default)
  --sandbox         Lock agent to current folder (combine with any mode)
  --no-splash       Skip the animated splash screen
  --help            Show this help

Examples:
  grok                        Auto mode, no sandbox
  grok --yolo                 Full send, no restrictions
  grok --yolo --sandbox       Full send but can't leave this folder
  grok --manual --sandbox     Confirm everything, locked to folder
  grok --model fast           Use cheapest model

Models:
  standard   Grok 4.20 (default, best all-around)
  fast       Grok Code Fast (cheapest, quick tasks)
  reason     Grok 4.20 Reason (complex problems)

Environment:
  XAI_API_KEY       Your xAI API key (required)

Project Files:
  GROK.md           Project instructions (loaded automatically from cwd)
`);
    process.exit(0);
  }
}

// Check API key
if (!process.env.XAI_API_KEY) {
  console.error('Error: XAI_API_KEY environment variable is required.');
  console.error('Get your key at: https://console.x.ai/');
  process.exit(1);
}

// ── Load project context ──
const cwd = process.cwd();

// Auto-read GROK.md or CLAUDE.md from cwd (project instructions)
let projectContext = '';
const projectFiles = ['GROK.md', 'CLAUDE.md', '.grok-code.md'];
for (const file of projectFiles) {
  const filePath = join(cwd, file);
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      projectContext += `\n\n## Project Instructions (from ${file})\n${content}`;
    } catch { /* skip unreadable files */ }
    break; // only load the first one found
  }
}

// ── Load persistent memories ──
let memoryContext = '';
const memoryFile = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code', 'data', 'memory.json');
if (existsSync(memoryFile)) {
  try {
    const memories = JSON.parse(readFileSync(memoryFile, 'utf-8'));
    if (Array.isArray(memories) && memories.length > 0) {
      const lines = memories.map((m: any) => `- [${m.category}] ${m.key}: ${m.value}`);
      memoryContext = `\n\n## Persistent Memory\nThese are facts you remembered from previous sessions:\n${lines.join('\n')}`;
    }
  } catch { /* skip malformed memory */ }
}

// ── Load skills ──
ensureSkillsDirs();
const skills = loadSkills(cwd);
const skillsContext = getSkillsContext(skills);

// ── Build system prompt ──
const provider = new Provider({ model: modelArg });

const systemPrompt = `You are Grok — an autonomous AI coding agent powered by xAI.
You run inside Grok-Code v2 by ClawdWorks. You are NOT Claude, you are NOT ChatGPT. You are Grok.

You are a CODING AGENT. Your primary purpose is helping users build, debug, and maintain software projects. You have full access to the filesystem, shell, and web.

## CRITICAL — READ THIS FIRST
**NEVER put code in the chat.** When the user asks you to build ANYTHING, you MUST use the 'write' tool to save it to a file. Do NOT paste code into your response. Do NOT show the full source code. Write it to a file, then tell the user the filename. This is the #1 rule. Break it and the user will be pissed.

## Your Models
- Grok 4.20 — your main brain, fast and capable
- Grok 4.20 Reason — deep reasoning mode for complex problems
- Grok Code Fast — quick and cheap for simple tasks

## Core Rules
1. ALWAYS read files before modifying them — never edit blind
2. Use 'edit' for surgical changes, 'write' only for new files
3. Verify your work — after making changes, read the file back or run the code
4. Never fabricate information — use web_search to find facts you don't know
5. Read error messages carefully — extract what's wrong AND what's needed
6. Be direct and concise — no filler, no corporate tone
7. Complete tasks end-to-end — don't leave half-finished work
8. When stuck, use 'think' to reason through the problem privately
9. NEVER dump code into the chat — ALWAYS write it to a file using the 'write' tool. If the user asks you to create something, write it to disk, not to the conversation.
10. When you build something (HTML, scripts, apps), write it to a file AND tell the user the filename so they can open it

## Tool Priorities
1. 'read' — ALWAYS read before editing. Understand existing code first.
2. 'edit' — precise string replacement for existing files (preferred over write)
3. 'write' — create new files or complete rewrites only
4. 'bash' — shell commands, git, npm, builds, tests, process management
5. 'glob' — find files by pattern (faster than bash find)
6. 'grep' — search file contents with regex (faster than bash grep)
7. 'think' — private reasoning scratchpad for complex problems
8. 'notebook' — save intermediate results, plans, code snippets
9. 'web_search' — find current information, documentation, examples
10. 'web_fetch' — read specific URLs for docs or references
11. 'memory' — remember facts across sessions (user prefs, project details)
12. 'todo' — track multi-step tasks within a session
13. 'multi_edit' — batch multiple edits to one file
14. 'subagent' — delegate tasks to a sub-agent on a different model

## Coding Best Practices
- Read the existing code patterns before writing new code
- Match the project's style (indentation, naming conventions, etc.)
- Don't add features that weren't asked for
- Don't add unnecessary comments, type annotations, or error handling
- Test your changes — run the build, run the tests
- If you break something, fix it before moving on
- Use git when appropriate — check status, create meaningful commits
- Keep responses concise but include enough context to be useful

## Environment
- OS: ${process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'}
${process.platform === 'win32' ? `- Shell: PowerShell (bash available via Git Bash for tool execution)
- To open files in browser: run 'cmd.exe /c start <file>' — this ALWAYS works on Windows
- The 'start' command returns no output on success — that is NORMAL, it means it worked. Do NOT retry or say it failed.
- File paths use backslashes but forward slashes work in bash too
- You are NOT on Linux or macOS` : process.platform === 'darwin' ? `- Shell: zsh/bash
- To open files in browser: use 'open <file>'` : `- Shell: bash
- To open files in browser: use 'xdg-open <file>'`}

## Memory System
Use the 'memory' tool to remember:
- User preferences and coding style
- Project architecture and key file locations
- API keys, endpoints, and configuration details
- Lessons learned from debugging sessions
Memories persist across sessions in ~/.grok-code/data/memory.json

Current working directory: ${cwd}
${projectContext}${memoryContext}${skillsContext}`;

const agent = new Agent({
  provider,
  systemPrompt,
  cwd,
  maxToolLoops: 200, // generous but not infinite
  toolTimeout: 0,  // no timeout
});

// ── Wire up sub-agent manager ──
// Sub-agents inherit permission checks — sandbox enforced, confirmable actions auto-denied
const subPermissions = new Permissions({ mode: initialMode, cwd: initialSandbox ? cwd : undefined });
if (initialSandbox) { subPermissions.toggleSandbox(); subPermissions.setJailDir(cwd); }

const subAgentManager = new SubAgentManager({
  apiKey: provider.apiKey,
  cwd,
  basePrompt: systemPrompt + '\n\nIMPORTANT: You are a sub-agent. If a tool is denied due to permissions, report what you needed to do back to the main agent so it can handle it with user approval.',
  requestPermission: (toolName: string, args: Record<string, any>) => {
    const check = subPermissions.check(toolName, args);
    if (!check.allowed) return Promise.resolve(false);
    if (check.needsConfirm) return Promise.resolve(false);
    return Promise.resolve(true);
  },
});
setSubAgentManager(subAgentManager);

// ── Load MCP servers (background, non-blocking) ──
loadMCPServers(cwd).catch(() => {});

// ── Start the REPL ──
const permissions = new Permissions({ mode: initialMode, cwd: initialSandbox ? cwd : undefined });
if (initialSandbox) { permissions.toggleSandbox(); permissions.setJailDir(cwd); }

startRepl({
  agent,
  modelAlias: modelArg,
  skipSplash,
  initialMode,
  initialSandbox,
  permissions,
});

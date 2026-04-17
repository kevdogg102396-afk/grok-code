/**
 * Raw REPL — no Ink for the chat area.
 * Uses process.stdout.write for output, readline for input.
 * Stable, no rendering glitches, no cursor drift.
 */

import * as readline from 'readline';
import chalk from 'chalk';
import gradientString from 'gradient-string';
import { gradientColors, colors, brand } from './theme.js';
import { Agent } from '../core/agent.js';
import { Permissions, type PermissionMode } from '../permissions/permissions.js';
import { calculateCost, formatCost } from '../util/cost.js';
import { formatTokenCount } from '../util/tokens.js';
import { isPro, activateLicense, requirePro } from '../core/license.js';
import { isFirstLaunch, getCompanionId, saveCompanionConfig } from '../core/companion-config.js';
import { COMPANIONS, COMPANION_IDS, getRandomQuip } from './companions.js';
import { setConfigValue, loadConfig } from '../core/config.js';
import { basename } from 'path';

const gradient = gradientString(...gradientColors.splash);

// Footer state — tracks height so we can erase it before new content
let lastFooterHeight = 0;

// ── Colors ──
const c = {
  prompt: chalk.hex(colors.success).bold,
  primary: chalk.hex(colors.primary),
  dim: chalk.hex(colors.dim),
  muted: chalk.hex(colors.muted),
  warning: chalk.hex(colors.warning),
  error: chalk.hex(colors.error),
  secondary: chalk.hex(colors.secondary),
  bold: chalk.bold,
  text: chalk.white,
};

export interface ReplConfig {
  agent: Agent;
  modelAlias: string;
  skipSplash: boolean;
  initialMode: PermissionMode;
  initialSandbox: boolean;
  permissions: Permissions;
}

export async function startRepl(config: ReplConfig): Promise<void> {
  const { agent, modelAlias, permissions } = config;
  let currentMode = config.initialMode;
  let isSandboxed = config.initialSandbox;
  let companionId = getCompanionId();
  const history: string[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // ── First launch: character picker ──
  if (isFirstLaunch()) {
    companionId = await pickCharacter(rl);
    saveCompanionConfig({ companionId, firstLaunchComplete: true });
  }

  // ── Splash ──
  if (!config.skipSplash) {
    showSplash(agent.stats.modelName);
  }

  // ── Footer ──
  drawFooter(agent, currentMode, isSandboxed, modelAlias, companionId, 'idle');

  // ── Main loop ──
  const promptUser = () => {
    rl.question(c.prompt('❯ '), async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { promptUser(); return; }
      history.push(trimmed);

      // ── Slash commands ──
      if (trimmed.startsWith('/')) {
        eraseLastFooter(calcInputLines(trimmed));
        const [cmd, ...rest] = trimmed.slice(1).split(' ');
        const arg = rest.join(' ');
        const handled = await handleCommand(cmd, arg, agent, permissions, currentMode, isSandboxed, companionId, modelAlias,
          (m) => { currentMode = m; },
          (s) => { isSandboxed = s; },
          (cid) => { companionId = cid; }
        );
        if (handled === 'quit') { rl.close(); process.exit(0); }
        drawFooter(agent, currentMode, isSandboxed, modelAlias, companionId, 'idle');
        promptUser();
        return;
      }

      // ── Run agent ──
      eraseLastFooter(calcInputLines(trimmed));
      console.log(''); // blank line before response

      let currentStream = '';
      let lastFlushed = 0;
      let batchTimer: ReturnType<typeof setTimeout> | null = null;

      (agent as any).onText = (chunk: string) => {
        currentStream += chunk;
        // Batch: flush new text every 80ms
        if (!batchTimer) {
          batchTimer = setTimeout(() => {
            const newText = currentStream.slice(lastFlushed);
            if (newText) {
              // On Windows, \n alone doesn't carriage return — need \r\n
              const fixed = newText.replace(/\r?\n/g, '\r\n');
              process.stdout.write(fixed);
              lastFlushed = currentStream.length;
            }
            batchTimer = null;
          }, 80);
        }
      };

      let toolCount = 0;
      let lastToolEvent: 'idle' | 'toolStart' | 'toolDone' | 'error' = 'idle';
      (agent as any).onToolStart = (name: string, args: Record<string, any>) => {
        toolCount++;
        lastToolEvent = 'toolStart';
        // Show each tool as it fires with a brief args preview
        let preview = '';
        if (name === 'bash' && args.command) {
          preview = args.command.length > 60 ? args.command.slice(0, 57) + '...' : args.command;
        } else if (name === 'read' && args.file_path) {
          preview = args.file_path;
        } else if (name === 'write' && args.file_path) {
          preview = args.file_path;
        } else if (name === 'edit' && args.file_path) {
          preview = args.file_path;
        } else if (name === 'glob' && args.pattern) {
          preview = args.pattern;
        } else if (name === 'grep' && args.pattern) {
          preview = args.pattern;
        } else if (name === 'web_search' && args.query) {
          preview = args.query;
        } else if (name === 'web_fetch' && args.url) {
          preview = args.url.length > 50 ? args.url.slice(0, 47) + '...' : args.url;
        } else {
          // Generic: show first string arg
          const firstStr = Object.values(args).find(v => typeof v === 'string') as string | undefined;
          if (firstStr) preview = firstStr.length > 50 ? firstStr.slice(0, 47) + '...' : firstStr;
        }
        const line = preview
          ? `  ${c.dim('⚡')} ${c.primary(name)} ${c.muted(preview)}`
          : `  ${c.dim('⚡')} ${c.primary(name)}`;
        process.stdout.write(line + '\r\n');
      };

      (agent as any).onToolEnd = (name: string, result: any) => {
        if (result?.error) {
          lastToolEvent = 'error';
          process.stdout.write(`  ${c.error('✗')} ${c.dim(name)} ${c.error(typeof result.error === 'string' ? result.error.slice(0, 60) : 'failed')}\r\n`);
        } else {
          lastToolEvent = 'toolDone';
          const outLen = result?.output?.length || 0;
          const sizeHint = outLen > 1000 ? ` ${c.muted(`(${(outLen / 1024).toFixed(1)}KB)`)}` : '';
          process.stdout.write(`  ${c.secondary('✓')} ${c.dim(name)}${sizeHint}\r\n`);
        }
      };

      (agent as any).onUsage = () => {};

      (agent as any).requestPermission = async (toolName: string, args: Record<string, any>): Promise<boolean> => {
        const check = permissions.check(toolName, args);
        if (!check.allowed) {
          console.log(c.warning(check.reason || `Blocked: ${toolName}`));
          return false;
        }
        if (!check.needsConfirm) return true;

        // Ask for permission
        return new Promise<boolean>((resolve) => {
          const argStr = Object.entries(args)
            .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80)}`)
            .join('\n');
          console.log('');
          console.log(c.warning('⚠ Permission Required'));
          console.log(`Tool: ${c.primary(toolName)}`);
          if (check.reason) console.log(c.muted(check.reason));
          console.log(c.muted(argStr));
          rl.question(`Allow? ${c.prompt('[Y]')}/${c.error('[N]')}: `, (answer) => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });
      };

      const result = await agent.run(trimmed);

      // Flush any remaining batched text
      if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
      if (lastFlushed < currentStream.length) {
        const remaining = currentStream.slice(lastFlushed);
        process.stdout.write(remaining.replace(/\r?\n/g, '\r\n'));
      }

      // Force cursor to column 0 on a new line
      process.stdout.write('\r\n');

      // If no streaming happened, print the full response
      if (!currentStream && result.text) {
        console.log(result.text);
      }

      if (result.error) {
        console.log(c.error(`Error: ${result.error}`));
      }

      // Show tool summary if tools were used
      if (toolCount > 0) {
        console.log(c.dim(`  ⚡ ${toolCount} tool${toolCount > 1 ? 's' : ''} used`));
      }

      // Footer with buddy — event reflects what just happened
      const footerEvent = result.error ? 'error' : toolCount > 0 ? 'toolDone' : 'idle';
      drawFooter(agent, currentMode, isSandboxed, modelAlias, companionId, footerEvent as any);
      promptUser();
    });
  };

  promptUser();
}

// ── Splash Screen ──
function showSplash(model: string): void {
  const figlet = require('figlet');
  let title: string;
  try {
    title = figlet.textSync('GROK CODE', { font: 'ANSI Shadow', horizontalLayout: 'fitted' });
    title = gradient.multiline(title);
  } catch {
    title = gradient('GROK CODE');
  }

  console.log('');
  console.log(c.warning('  ★    ✦       ★          ✦        ★       ✦      ★'));
  console.log('');
  console.log(title);
  console.log('');
  console.log(c.primary.bold(`          ${brand.tagline}`));
  console.log(c.dim(`     AI coding agent powered by xAI's Grok`));
  console.log('');
  console.log(`  ${c.text('Model:')}   ${c.primary(model)}`);
  console.log(`  ${c.text('Version:')} ${c.primary(`v${brand.version}`)}`);
  console.log('');
  console.log(c.warning('  ★    ✦       ★          ✦        ★       ✦      ★'));
  console.log('');
}

// ── Footer: erase previous, draw new, stays at bottom ──
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

function calcInputLines(input: string): number {
  const cols = process.stdout.columns || 80;
  const promptLen = 2; // "❯ " = 2 visual chars
  return Math.ceil((promptLen + input.length) / cols) || 1;
}

function eraseLastFooter(inputLines: number = 1): void {
  if (lastFooterHeight <= 0) return;
  // Move up past input line(s) + footer, delete footer lines, move back past input
  const totalUp = lastFooterHeight + inputLines;
  process.stdout.write(`\x1b[${totalUp}A`);
  for (let i = 0; i < lastFooterHeight; i++) {
    process.stdout.write('\x1b[M'); // delete line, content below shifts up
  }
  process.stdout.write(`\x1b[${inputLines}B`);
  lastFooterHeight = 0;
}

function drawFooter(
  agent: Agent, mode: string, sandboxed: boolean, modelAlias: string,
  companionId?: string, event?: 'idle' | 'toolStart' | 'toolDone' | 'error',
): void {
  const lines = buildFooterBox(agent, mode, sandboxed, modelAlias, companionId, event);
  for (const line of lines) {
    process.stdout.write(line + '\r\n');
  }
  lastFooterHeight = lines.length;
}

function buildFooterBox(
  agent: Agent, mode: string, sandboxed: boolean, modelAlias: string,
  companionId?: string, event?: 'idle' | 'toolStart' | 'toolDone' | 'error',
): string[] {
  const stats = agent.stats;
  const cost = calculateCost(modelAlias, { prompt_tokens: stats.usage.prompt_tokens, completion_tokens: stats.usage.completion_tokens });
  const modeColor = mode === 'yolo' ? c.error : mode === 'manual' ? c.warning : c.secondary;
  const bdr = chalk.hex(colors.primary);

  let gradTitle: string;
  try { gradTitle = gradient('GROK CODE'); } catch { gradTitle = 'GROK CODE'; }

  const w = Math.min(process.stdout.columns || 80, 120);

  // Get buddy frame
  const companion = companionId ? COMPANIONS[companionId] : null;
  let buddyLines: string[] = [];
  let quip = '';
  if (companion && companion.frames.length > 0) {
    const frameIdx = event === 'error' ? 1 : event === 'toolDone' ? 3 : 0;
    buddyLines = companion.frames[frameIdx % companion.frames.length];
    quip = event && event !== 'idle'
      ? getRandomQuip(companion, event)
      : getRandomQuip(companion, 'idle');
  }

  // Content rows
  const statsLine = `${c.primary.bold(stats.modelName)} ${c.dim('│')} ${c.muted(`↑${formatTokenCount(stats.usage.prompt_tokens)} ↓${formatTokenCount(stats.usage.completion_tokens)}`)} ${c.dim('│')} ${c.warning(formatCost(cost))} ${c.dim('│')} ${modeColor(mode.toUpperCase())}${sandboxed ? c.warning(' 🔒') : ''} ${c.dim('│')} ${c.muted(basename(process.cwd()))}`;
  const quipLine = companion && quip
    ? c.dim(`${companion.name}: `) + chalk.hex(companion.color).italic(quip.length > 40 ? quip.slice(0, 37) + '...' : quip)
    : '';

  const contentRows = [gradTitle, '', statsLine, quipLine];

  // Compose line with right border forced to exact column via ANSI cursor
  function composeLine(content: string, buddy: string | null): string {
    const cLen = stripAnsi(content).length;
    const bLen = buddy ? stripAnsi(buddy).length : 0;
    const gap = Math.max(1, w - cLen - bLen - 4);
    let line = bdr('│') + ' ' + content + ' '.repeat(gap);
    if (buddy) line += buddy;
    // Force right border to exact column w — guarantees alignment
    line += `\x1b[${w}G` + bdr('│');
    return line;
  }

  const maxRows = Math.max(contentRows.length, buddyLines.length);
  const lines: string[] = [];
  lines.push(bdr('╭' + '─'.repeat(w - 2) + '╮'));
  for (let i = 0; i < maxRows; i++) {
    const content = i < contentRows.length ? contentRows[i] : '';
    const buddy = i < buddyLines.length ? buddyLines[i] : null;
    lines.push(composeLine(content, buddy));
  }
  lines.push(bdr('╰' + '─'.repeat(w - 2) + '╯'));
  return lines;
}

// ── Character Picker ──
async function pickCharacter(rl: readline.Interface): Promise<string> {
  console.log('');
  console.log(c.primary.bold('Choose Your Companion'));
  console.log(c.muted('They\'ll hang out with you while you code'));
  console.log('');

  for (let i = 0; i < COMPANION_IDS.length; i++) {
    const comp = COMPANIONS[COMPANION_IDS[i]];
    console.log(`  ${chalk.hex(comp.color).bold(`${i + 1}. ${comp.name}`)} — ${c.muted(comp.description)}`);
  }

  console.log('');
  return new Promise((resolve) => {
    rl.question(c.prompt('Pick (1-4): '), (answer) => {
      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < COMPANION_IDS.length) {
        const picked = COMPANION_IDS[idx];
        console.log(`\n${chalk.hex(COMPANIONS[picked].color).bold(`${COMPANIONS[picked].name} is ready!`)}\n`);
        resolve(picked);
      } else {
        console.log(`\n${c.primary.bold('Zyx is ready!')}\n`);
        resolve('alien');
      }
    });
  });
}

// ── Slash Commands ──
async function handleCommand(
  cmd: string, arg: string,
  agent: Agent, permissions: Permissions,
  mode: PermissionMode, sandboxed: boolean, companionId: string, modelAlias: string,
  setMode: (m: PermissionMode) => void,
  setSandboxed: (s: boolean) => void,
  setCompanionId: (id: string) => void,
): Promise<string | void> {
  switch (cmd) {
    case 'quit':
    case 'exit':
      return 'quit';

    case 'help':
      console.log(`
${c.bold('Commands:')}
  /help           — this message
  /model          — switch model (standard, fast, reason)
  /models         — list all models
  /mode           — permission mode (manual, auto, yolo)
  /mode sandbox   — toggle folder jail
  /companion      — switch companion character
  /about          — version, license, support links
  /activate <key> — activate Pro license
  /settings       — configure startup behavior
  /stats          — token usage
  /reset          — clear conversation
  /quit           — exit
`);
      return;

    case 'model': {
      if (!arg) {
        const models = agent.getProvider().listModels();
        const list = models.map(m => `${m.active ? '> ' : '  '}${m.alias} — ${m.name}`).join('\n');
        console.log(`\n${c.bold('Current model:')} ${agent.stats.modelName}\n\n${list}\n\nSwitch: /model <alias>\n`);
      } else {
        if (agent.switchModel(arg)) {
          agent.reset();
          console.log(`\nSwitched to ${c.primary.bold(agent.stats.modelName)}. Conversation reset.\n`);
        } else {
          console.log(`\nUnknown model: ${arg}. Use /model to see options.\n`);
        }
      }
      return;
    }

    case 'models': {
      const models = agent.getProvider().listModels();
      const list = models.map(m => `${m.active ? '> ' : '  '}${m.alias} — ${m.name} (${m.context / 1024}K ctx)`).join('\n');
      console.log(`\n${c.bold('Models:')}\n${list}\n`);
      return;
    }

    case 'mode': {
      if (!arg) {
        console.log(`\nCurrent mode: ${c.bold(mode)}${sandboxed ? ' + sandbox' : ''}\n${permissions.getModeDescription()}\n`);
      } else if (arg === 'sandbox') {
        if (!isPro()) {
          console.log(`\n${requirePro('Sandbox mode')}\n`);
          return;
        }
        const on = permissions.toggleSandbox();
        if (on) permissions.setJailDir(process.cwd());
        setSandboxed(on);
        setConfigValue('lastSandbox', on);
        console.log(`\nSandbox ${on ? 'enabled 🔒' : 'disabled'}\n${permissions.getModeDescription()}\n`);
      } else {
        const validModes = ['manual', 'auto', 'yolo'];
        if (validModes.includes(arg)) {
          if (arg === 'yolo' && !isPro()) {
            console.log(`\n${requirePro('YOLO mode')}\n`);
            return;
          }
          permissions.setMode(arg as PermissionMode);
          setMode(arg as PermissionMode);
          setConfigValue('lastMode', arg as PermissionMode);
          console.log(`\nMode: ${c.bold(arg)}${sandboxed ? ' + sandbox' : ''}\n${permissions.getModeDescription()}\n`);
        } else {
          console.log(`\nUnknown mode: ${arg}\nAvailable: manual, auto, yolo\nToggle sandbox: /mode sandbox\n`);
        }
      }
      return;
    }

    case 'companion': {
      if (!arg) {
        const current = COMPANIONS[companionId];
        const list = COMPANION_IDS.map(id => `${id === companionId ? '> ' : '  '}${COMPANIONS[id].name} (${id})`).join('\n');
        console.log(`\nCurrent companion: ${c.bold(current.name)}\n\n${list}\n\nSwitch: /companion <id>\n`);
      } else if (COMPANIONS[arg]) {
        if (arg !== 'alien' && !isPro()) {
          console.log(`\n${requirePro('Extra companions')}\n`);
        } else {
          setCompanionId(arg);
          saveCompanionConfig({ companionId: arg, firstLaunchComplete: true });
          console.log(`\nSwitched to ${chalk.hex(COMPANIONS[arg].color).bold(COMPANIONS[arg].name)}!\n`);
        }
      } else {
        console.log(`\nUnknown companion: ${arg}\nAvailable: ${COMPANION_IDS.join(', ')}\n`);
      }
      return;
    }

    case 'stats': {
      const s = agent.stats;
      console.log(`\nModel: ${s.modelName}\nMessages: ${s.messages}\nTokens: ↑${s.usage.prompt_tokens} ↓${s.usage.completion_tokens}\n`);
      return;
    }

    case 'reset':
      agent.reset();
      console.log('\nConversation reset.\n');
      return;

    case 'about': {
      const pro = isPro() ? '✅ Pro' : '🆓 Free';
      console.log('');
      console.log(`${c.bold(`GROK CODE v${brand.version}`)} — ${pro}`);
      console.log(brand.tagline);
      console.log('');
      if (isPro()) {
        console.log('Thanks for being Pro! All features unlocked.');
      } else {
        console.log(`Upgrade to Pro ($5): https://grok-code-checkout.kevdogg102396.workers.dev`);
        console.log(`Activate: /activate <key>`);
      }
      console.log('');
      console.log(`${c.dim('Tip the dev:')} Cash App $k3v096 or https://cash.app/$k3v096`);
      console.log(`${c.dim('Star on GitHub:')} https://github.com/kevdogg102396-afk/grok-code`);
      console.log('');
      console.log(c.dim('Built with ❤️  by Kevin Cline & Claude'));
      console.log('');
      return;
    }

    case 'activate': {
      if (!arg) {
        console.log('\nUsage: /activate <license-key>\nGet a key at: https://grok-code-checkout.kevdogg102396.workers.dev\n');
      } else {
        console.log('\nVerifying license with server…');
        const result = await activateLicense(arg);
        console.log(`\n${result.message}\n`);
      }
      return;
    }

    case 'settings': {
      const savedConfig = loadConfig();
      if (!arg) {
        console.log(`\n${c.bold('Settings:')}\n\n/settings startmode <auto|yolo|manual|last>\n  Current: ${savedConfig.startMode || 'auto (default)'}\n`);
      } else if (arg.startsWith('startmode')) {
        const val = arg.split(' ')[1];
        if (val && ['auto', 'yolo', 'manual', 'last'].includes(val)) {
          setConfigValue('startMode', val as any);
          console.log(`\nStart mode: ${c.bold(val)}\n`);
        } else {
          console.log('\nUsage: /settings startmode <auto|yolo|manual|last>\n');
        }
      }
      return;
    }

    default:
      console.log(`\nUnknown command: /${cmd}\nType /help for available commands.\n`);
      return;
  }
}

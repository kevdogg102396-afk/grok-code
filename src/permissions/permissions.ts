import { DANGEROUS_PATTERNS } from './patterns.js';
import { resolve, relative, isAbsolute } from 'path';

export type PermissionMode = 'manual' | 'auto' | 'yolo';

export interface PermissionCheck {
  allowed: boolean;
  needsConfirm: boolean;
  reason?: string;
  dangerous?: boolean;
}

// Tools that are always safe (read-only, no side effects)
const SAFE_TOOLS = new Set([
  'read', 'glob', 'grep', 'think', 'notebook', 'todo',
  'web_search',
]);

// Tools that modify files or execute commands
const WRITE_TOOLS = new Set([
  'bash', 'write', 'edit', 'multi_edit', 'web_fetch', 'memory', 'subagent',
]);

// Shell expansion patterns that can bypass sandbox path checks
const SHELL_EXPANSION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\$\(/, reason: 'command substitution $()' },
  { pattern: /`[^`]+`/, reason: 'backtick command substitution' },
  { pattern: /\$\{[^}]*\}/, reason: 'variable expansion ${}' },
  { pattern: /\$HOME\b/, reason: '$HOME variable' },
  { pattern: /\$USER(?:PROFILE)?\b/, reason: '$USER/$USERPROFILE variable' },
  { pattern: /\$PWD\b/, reason: '$PWD variable' },
  { pattern: /\$OLDPWD\b/, reason: '$OLDPWD variable' },
  { pattern: /\$(?:TEMP|TMP|TMPDIR)\b/, reason: '$TEMP/$TMP variable' },
  { pattern: /\$(?:PATH|LD_LIBRARY_PATH|LD_PRELOAD)\b/, reason: 'PATH/library variable' },
  { pattern: /\$(?:XAI_API_KEY|API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\b/i, reason: 'secret/credential variable' },
  { pattern: /\beval\s/, reason: 'eval command (arbitrary execution)' },
  { pattern: /\bsource\s/, reason: 'source command' },
  { pattern: /\b\.\s+\//, reason: 'dot-source command' },
  { pattern: /\bexec\s/, reason: 'exec command' },
  { pattern: /\/proc\/self\//, reason: '/proc/self access' },
  { pattern: /\/dev\/tcp\//, reason: '/dev/tcp network access' },
  { pattern: /\benv\b\s/, reason: 'env command (environment access)' },
  { pattern: /\bprintenv\b/, reason: 'printenv command' },
  { pattern: /\bset\b\s*$/, reason: 'set command (dump all variables)' },
];

export class Permissions {
  private mode: PermissionMode;
  private jailDir: string | null = null;
  private sandboxEnabled = false;

  constructor(config: { mode?: PermissionMode; cwd?: string } = {}) {
    this.mode = config.mode || 'auto';
    if (config.cwd) {
      this.jailDir = resolve(config.cwd);
    }
  }

  check(toolName: string, args: Record<string, unknown> = {}): PermissionCheck {
    // Always check jail first if sandbox is enabled (regardless of mode)
    if (this.sandboxEnabled && this.jailDir) {
      const jailCheck = this.checkJail(toolName, args);
      if (jailCheck) return jailCheck;
    }

    switch (this.mode) {
      case 'manual':
        // Everything needs confirmation
        return { allowed: true, needsConfirm: true, reason: `Manual mode: confirm ${toolName}` };

      case 'auto':
        // Safe tools pass, write tools ask, dangerous bash patterns warn
        if (SAFE_TOOLS.has(toolName)) {
          return { allowed: true, needsConfirm: false };
        }
        if (toolName === 'bash' && args.command) {
          for (const { pattern, reason } of DANGEROUS_PATTERNS) {
            if (pattern.test(args.command as string)) {
              return { allowed: true, needsConfirm: true, reason: `\u26a0 ${reason}`, dangerous: true };
            }
          }
        }
        if (WRITE_TOOLS.has(toolName)) {
          return { allowed: true, needsConfirm: true, reason: `${toolName} needs approval` };
        }
        return { allowed: true, needsConfirm: false };

      case 'yolo':
        // Everything goes, no restrictions
        return { allowed: true, needsConfirm: false };

      default:
        return { allowed: true, needsConfirm: true };
    }
  }

  private checkJail(toolName: string, args: Record<string, unknown>): PermissionCheck | null {
    if (!this.jailDir) return null;

    // Check file path arguments for jail escape
    const pathArgs = ['file_path', 'path'];
    for (const key of pathArgs) {
      if (args[key] && typeof args[key] === 'string') {
        const rawPath = args[key] as string;
        const targetPath = resolve(this.jailDir, rawPath.replace(/^~/, process.env['HOME'] || process.env['USERPROFILE'] || ''));
        const rel = relative(this.jailDir, targetPath);
        if (rel.startsWith('..') || (isAbsolute(rel) && !targetPath.startsWith(this.jailDir))) {
          return {
            allowed: false,
            needsConfirm: false,
            reason: `\u{1F512} Sandbox: blocked access outside ${this.jailDir}\n   Tried: ${targetPath}`,
          };
        }
      }
    }

    // Check bash commands for directory escapes
    if (toolName === 'bash' && args.command) {
      const cmd = args.command as string;

      // Block shell expansion tricks that could bypass path checks
      // This catches: $(), backticks, $HOME, $USER, eval, exec, etc.
      for (const { pattern, reason } of SHELL_EXPANSION_PATTERNS) {
        if (pattern.test(cmd)) {
          return {
            allowed: false,
            needsConfirm: false,
            reason: `\u{1F512} Sandbox: blocked shell expansion (${reason})\n   Command: ${cmd.slice(0, 100)}`,
          };
        }
      }

      // Safe commands that should always work even in sandbox
      // (opening files in browser, editors, etc.)
      // NOTE: shell expansion tricks are caught above, so these can't be weaponized
      const safeCommandPatterns = [
        /^\s*start\s/i,              // Windows: open file in default app
        /^\s*explorer\s/i,           // Windows: open explorer
        /^\s*code\s/i,               // VS Code
        /^\s*node\s/,                // Node.js
        /^\s*bun\s/,                 // Bun
        /^\s*npm\s/,                 // npm
        /^\s*npx\s/,                 // npx
        /^\s*git\s/,                 // git
        /^\s*python\s/,              // python
        /^\s*pip\s/,                 // pip
      ];
      const isSafeCommand = safeCommandPatterns.some(p => p.test(cmd));

      // Block absolute paths outside jail (e.g. cat /etc/passwd, ls C:\Users)
      if (!isSafeCommand) {
        const absPathMatch = cmd.match(/(?:^|\s)(\/[a-zA-Z][\w\-\/\.]*|[A-Z]:\\[\w\-\\\.]*)/g);
        if (absPathMatch) {
          for (const match of absPathMatch) {
            const absPath = match.trim();
            const rel = relative(this.jailDir, absPath);
            if (rel.startsWith('..') || !absPath.startsWith(this.jailDir)) {
              return {
                allowed: false,
                needsConfirm: false,
                reason: `\u{1F512} Sandbox: blocked absolute path outside jail\n   Path: ${absPath}`,
              };
            }
          }
        }
      }

      // Block .. traversal in commands
      if (/\.\.[\/\\]/.test(cmd)) {
        return {
          allowed: false,
          needsConfirm: false,
          reason: `\u{1F512} Sandbox: blocked directory traversal (..) in command`,
        };
      }

      // Block ~ home directory references
      if (/(?:^|\s)~[\/\\]/.test(cmd)) {
        return {
          allowed: false,
          needsConfirm: false,
          reason: `\u{1F512} Sandbox: blocked home directory (~/) access`,
        };
      }

      // Block cd to outside jail
      const cdMatch = cmd.match(/cd\s+["']?([^"';\s&|]+)/);
      if (cdMatch) {
        const target = resolve(this.jailDir, cdMatch[1].replace(/^~/, process.env['HOME'] || process.env['USERPROFILE'] || ''));
        const rel = relative(this.jailDir, target);
        if (rel.startsWith('..')) {
          return {
            allowed: false,
            needsConfirm: false,
            reason: `\u{1F512} Sandbox: cd outside jail blocked\n   Tried: ${target}`,
          };
        }
      }
    }

    return null; // Passes jail check
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode;
  }

  getMode(): PermissionMode {
    return this.mode;
  }

  setJailDir(dir: string | null): void {
    this.jailDir = dir ? resolve(dir) : null;
  }

  getJailDir(): string | null {
    return this.jailDir;
  }

  toggleSandbox(): boolean {
    this.sandboxEnabled = !this.sandboxEnabled;
    if (!this.sandboxEnabled) {
      this.jailDir = null;
    }
    return this.sandboxEnabled;
  }

  isSandboxed(): boolean {
    return this.sandboxEnabled;
  }

  isJailed(): boolean {
    return this.sandboxEnabled && this.jailDir !== null;
  }

  getModeDescription(): string {
    const sandboxSuffix = this.sandboxEnabled
      ? ` + Sandbox (jailed to ${this.jailDir || 'cwd'})`
      : '';

    switch (this.mode) {
      case 'manual': return `Manual \u2014 confirms every action${sandboxSuffix}`;
      case 'auto': return `Auto \u2014 safe actions run, dangerous ones ask${sandboxSuffix}`;
      case 'yolo': return `YOLO \u2014 full send, no restrictions${sandboxSuffix}`;
    }
  }
}

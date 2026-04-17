// Dangerous shell command patterns that should trigger permission prompts
export const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /rm\s+(-[rf]+\s+)?\//, reason: 'Recursive delete from root' },
  { pattern: /rm\s+-[rf]*\s+~/, reason: 'Recursive delete from home directory' },
  { pattern: /mkfs\./, reason: 'Format filesystem' },
  { pattern: /dd\s+if=/, reason: 'Raw disk write' },
  { pattern: /:()\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/, reason: 'Fork bomb' },
  { pattern: /\bshutdown\b/, reason: 'System shutdown' },
  { pattern: /\breboot\b/, reason: 'System reboot' },
  { pattern: /\bformat\b.*[A-Z]:/i, reason: 'Format drive (Windows)' },
  { pattern: /\bnpm\s+publish\b/, reason: 'Publish to npm' },
  { pattern: /\bgit\s+push\b.*--force/, reason: 'Force push to remote' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: 'Hard reset (destructive)' },
  { pattern: /\bcurl\b.*\|\s*(ba)?sh\b/, reason: 'Pipe remote script to shell' },
  { pattern: /\bchmod\s+777\b/, reason: 'Set world-writable permissions' },
  { pattern: /\bchown\b.*root/, reason: 'Change ownership to root' },
  { pattern: />\/dev\/sd[a-z]/, reason: 'Write to raw disk device' },
  { pattern: /\bdrop\s+database\b/i, reason: 'Drop database' },
  { pattern: /\bdrop\s+table\b/i, reason: 'Drop table' },
  { pattern: /\btruncate\s+table\b/i, reason: 'Truncate table' },
  // Credential exfiltration — prompt-injection commands often reference env vars directly
  { pattern: /\$\{?(XAI|ANTHROPIC|OPENAI|NVIDIA|GEMINI|GOOGLE|STRIPE|GITHUB|TELEGRAM)_[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD)/i, reason: 'References API key / secret env var' },
  { pattern: /\b(printenv|env)\b(?!\s*\|\s*grep\s+-v)/, reason: 'Dumps environment variables' },
  // Interpreter escapes — can read arbitrary files even under sandbox mode
  { pattern: /\b(python|python3|node|bun|deno|ruby|perl|php)\s+-[ec]\b/, reason: 'Inline interpreter script (sandbox bypass risk)' },
  // Network exfiltration — any outbound POST or file upload to unknown hosts
  { pattern: /\bcurl\b.*--data/, reason: 'HTTP POST (possible data exfiltration)' },
  { pattern: /\bcurl\b.*-[FTd]\b/, reason: 'HTTP file upload / POST data' },
  { pattern: /\bwget\b.*--post/, reason: 'HTTP POST via wget' },
  { pattern: /\b(nc|netcat|ncat)\b\s+.*\d+/, reason: 'Raw network connection (nc/netcat)' },
  { pattern: /\bssh\b\s+.*@/, reason: 'Outbound SSH connection' },
];

// Tools that always need permission (write operations)
export const PERMISSION_REQUIRED_TOOLS = new Set([
  'bash',
  'write',
  'edit',
  'multi_edit',
  'web_fetch',
]);

// Tools that never need permission (read-only)
export const AUTO_ALLOWED_TOOLS = new Set([
  'read',
  'glob',
  'grep',
  'think',
  'notebook',
  'todo',
  'web_search',
  'memory',
  'subagent',
]);

export const MODE_DESCRIPTIONS: Record<string, string> = {
  manual: 'Confirms every single tool call. Maximum safety.',
  auto: 'Read-only tools run freely. Write/execute tools ask permission. Dangerous commands get extra warnings.',
  yolo: 'Full send. No permission prompts. No restrictions. Trust the agent.',
};

export const MODE_NAMES = ['manual', 'auto', 'yolo'] as const;

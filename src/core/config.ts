import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface GrokCodeConfig {
  defaultModel?: string;
  personality?: string;
  permissionMode?: 'manual' | 'auto' | 'yolo';
  startMode?: 'auto' | 'last' | 'manual' | 'yolo';  // 'last' = remember last mode
  lastMode?: 'manual' | 'auto' | 'yolo';             // persisted when startMode='last'
  lastSandbox?: boolean;                               // persisted sandbox state
  maxTokens?: number;
  apiKey?: string; // fallback if XAI_API_KEY not set
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): GrokCodeConfig {
  ensureDir();
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: GrokCodeConfig): void {
  ensureDir();
  // Mode 0o600 — config may hold an apiKey fallback, so keep it owner-only.
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function getConfigValue<K extends keyof GrokCodeConfig>(key: K): GrokCodeConfig[K] {
  const config = loadConfig();
  return config[key];
}

export function setConfigValue<K extends keyof GrokCodeConfig>(key: K, value: GrokCodeConfig[K]): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

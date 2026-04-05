import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code');
const COMPANION_FILE = join(CONFIG_DIR, 'companion.json');

interface CompanionConfig {
  companionId: string;
  firstLaunchComplete: boolean;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadCompanionConfig(): CompanionConfig | null {
  if (!existsSync(COMPANION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(COMPANION_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveCompanionConfig(config: CompanionConfig): void {
  ensureDir();
  writeFileSync(COMPANION_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function isFirstLaunch(): boolean {
  const config = loadCompanionConfig();
  return !config || !config.firstLaunchComplete;
}

export function getCompanionId(): string {
  const config = loadCompanionConfig();
  return config?.companionId || 'alien';
}

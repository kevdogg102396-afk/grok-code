import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code');
const LICENSE_FILE = join(CONFIG_DIR, 'license.json');

interface LicenseData {
  key: string;
  activatedAt: string;
  tier: 'free' | 'pro';
  verified?: boolean;
  issuedAt?: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export function loadLicense(): LicenseData {
  return { key: '', activatedAt: '', tier: 'free', verified: true };
}

export async function activateLicense(_key: string): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'No license needed anymore. All Grok-Code features are unlocked for everyone. If it helps you, tips are welcome via /about.',
  };
}

export function deactivateLicense(): void {
  ensureDir();
  writeFileSync(LICENSE_FILE, JSON.stringify({ key: '', activatedAt: '', tier: 'free' }, null, 2), 'utf-8');
}

export function isPro(): boolean {
  return true;
}

export function requirePro(_featureName: string): string | null {
  return null;
}

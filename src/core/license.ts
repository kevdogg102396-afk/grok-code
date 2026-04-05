import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code');
const LICENSE_FILE = join(CONFIG_DIR, 'license.json');

// License key format: GC-XXXXX-XXXXX-XXXXX-XXXXX
// Validated with a checksum embedded in the key itself
const KEY_PREFIX = 'GC';
const KEY_PATTERN = /^GC-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

interface LicenseData {
  key: string;
  activatedAt: string;
  tier: 'free' | 'pro';
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

function validateKeyFormat(key: string): boolean {
  if (!KEY_PATTERN.test(key)) return false;

  // Checksum validation: last 2 chars of last segment = hash of first 3 segments
  const parts = key.split('-');
  const payload = parts.slice(0, 4).join('-');
  const checkSegment = parts[4];
  const s = [99,108,97,119,100,119,111,114,107,115,45,103,114,111,107].map(c=>String.fromCharCode(c)).join('');
  const hash = createHash('sha256').update(payload + s).digest('hex').toUpperCase();
  const expected = hash.slice(0, 3);

  return checkSegment.startsWith(expected);
}

export function loadLicense(): LicenseData {
  if (!existsSync(LICENSE_FILE)) {
    return { key: '', activatedAt: '', tier: 'free' };
  }
  try {
    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'));
    // Re-validate the key on load
    if (data.key && validateKeyFormat(data.key)) {
      return { ...data, tier: 'pro' };
    }
    return { key: '', activatedAt: '', tier: 'free' };
  } catch {
    return { key: '', activatedAt: '', tier: 'free' };
  }
}

export function activateLicense(key: string): { success: boolean; message: string } {
  const trimmed = key.trim().toUpperCase();

  if (!validateKeyFormat(trimmed)) {
    return { success: false, message: 'Invalid license key format. Keys look like: GC-XXXXX-XXXXX-XXXXX-XXXXX' };
  }

  ensureDir();
  const data: LicenseData = {
    key: trimmed,
    activatedAt: new Date().toISOString(),
    tier: 'pro',
  };
  writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), 'utf-8');

  return { success: true, message: 'Pro license activated! All features unlocked. Thank you for supporting ClawdWorks!' };
}

export function deactivateLicense(): void {
  ensureDir();
  writeFileSync(LICENSE_FILE, JSON.stringify({ key: '', activatedAt: '', tier: 'free' }, null, 2), 'utf-8');
}

export function isPro(): boolean {
  return loadLicense().tier === 'pro';
}

export function requirePro(featureName: string): string | null {
  if (isPro()) return null;
  return `⭐ **${featureName}** is a Pro feature.\n\nUpgrade for $5 (one-time): https://github.com/kevdogg102396-afk/grok-code\nThen activate: /activate <your-key>\n\nPro includes: all companions, all personalities, sub-agents, skills, advanced memory.`;
}


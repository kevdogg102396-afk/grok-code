import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code');
const LICENSE_FILE = join(CONFIG_DIR, 'license.json');
const VERIFY_URL = 'https://grok-code-checkout.kevdogg102396.workers.dev/api/verify';
const VERIFY_TIMEOUT_MS = 10000;

// License key format: GC-XXXXX-XXXXX-XXXXX-XXXXX
// Validated with a checksum embedded in the key itself
const KEY_PREFIX = 'GC';
const KEY_PATTERN = /^GC-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

interface LicenseData {
  key: string;
  activatedAt: string;
  tier: 'free' | 'pro';
  /** Whether this key was verified against the server-side KV store. Keys
   *  activated before server verification was added will lack this flag —
   *  they're grandfathered as valid. */
  verified?: boolean;
  issuedAt?: string;
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

async function verifyKeyWithServer(key: string): Promise<{ valid: boolean; reason?: string; issuedAt?: string | null }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), VERIFY_TIMEOUT_MS);
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      // 400 = bad format / bad json; 5xx = server error. Treat non-200 as network
      // error so the user gets a retry path rather than a hard reject.
      return { valid: false, reason: `server_${res.status}` };
    }
    const data: any = await res.json();
    return { valid: !!data.valid, reason: data.reason, issuedAt: data.issuedAt };
  } catch (err: any) {
    return { valid: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(t);
  }
}

export async function activateLicense(key: string): Promise<{ success: boolean; message: string }> {
  const trimmed = key.trim().toUpperCase();

  if (!validateKeyFormat(trimmed)) {
    return { success: false, message: 'Invalid license key format. Keys look like: GC-XXXXX-XXXXX-XXXXX-XXXXX' };
  }

  // Server-side verification: the key must actually exist in our records.
  // This is what prevents locally-generated forgeries from activating Pro.
  const verification = await verifyKeyWithServer(trimmed);

  if (!verification.valid) {
    if (verification.reason === 'timeout' || verification.reason === 'network_error') {
      return {
        success: false,
        message: 'Could not reach license server to verify your key. Check your internet and try again. If the issue persists, email kevin@clawdworks.com.',
      };
    }
    if (verification.reason === 'not_issued') {
      return {
        success: false,
        message: 'This license key was not found in our records. It may be a forgery, or it could be from before server verification was added. Email kevin@clawdworks.com with your Stripe receipt and we can fix it.',
      };
    }
    return {
      success: false,
      message: `License verification failed (${verification.reason || 'unknown'}). Email kevin@clawdworks.com if this is wrong.`,
    };
  }

  ensureDir();
  const data: LicenseData = {
    key: trimmed,
    activatedAt: new Date().toISOString(),
    tier: 'pro',
    verified: true,
    issuedAt: verification.issuedAt || undefined,
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
  return `⭐ **${featureName}** is a Pro feature.\n\nUpgrade for $5 (one-time): https://grok-code-checkout.kevdogg102396.workers.dev\nThen activate: /activate <your-key>\n\nPro includes: all companions, all personalities, sub-agents, skills, advanced memory.`;
}


import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CUSTOM_PATH = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code', 'personality.md');

export function getCustomPersonality() {
  if (!existsSync(CUSTOM_PATH)) return null;
  try {
    const content = readFileSync(CUSTOM_PATH, 'utf-8');
    return {
      id: 'custom',
      name: 'Custom',
      color: '#FFD700',
      greeting: 'Custom personality loaded.',
      systemPrompt: `## Personality: Custom\n${content}`,
    };
  } catch {
    return null;
  }
}

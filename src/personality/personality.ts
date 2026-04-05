import { DEFAULT_PERSONALITY } from './default.js';
import { UNHINGED_PERSONALITY } from './unhinged.js';
import { PROFESSIONAL_PERSONALITY } from './professional.js';
import { getCustomPersonality } from './custom.js';

export interface Personality {
  id: string;
  name: string;
  color: string;
  greeting: string;
  systemPrompt: string;
}

const PERSONALITIES: Record<string, Personality> = {
  default: DEFAULT_PERSONALITY,
  unhinged: UNHINGED_PERSONALITY,
  professional: PROFESSIONAL_PERSONALITY,
};

export class PersonalityManager {
  private current: Personality;

  constructor(initialId?: string) {
    this.current = this.resolve(initialId || 'default');
  }

  private resolve(id: string): Personality {
    if (id === 'custom') {
      const custom = getCustomPersonality();
      if (custom) return custom;
      return DEFAULT_PERSONALITY;
    }
    return PERSONALITIES[id] || DEFAULT_PERSONALITY;
  }

  get(): Personality {
    return this.current;
  }

  switch(id: string): Personality {
    this.current = this.resolve(id);
    return this.current;
  }

  list(): Personality[] {
    const all = Object.values(PERSONALITIES);
    const custom = getCustomPersonality();
    if (custom) all.push(custom);
    return all;
  }

  getSystemPromptSection(): string {
    return this.current.systemPrompt;
  }
}

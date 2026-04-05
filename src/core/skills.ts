import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

export interface Skill {
  name: string;
  description: string;
  trigger?: string;  // keyword that auto-triggers this skill
  content: string;   // the full markdown content (instructions for the agent)
  source: string;    // file path
}

const GLOBAL_SKILLS_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code', 'skills');

export function loadSkills(cwd: string): Skill[] {
  const skills: Skill[] = [];

  // Load from global dir
  loadFromDir(GLOBAL_SKILLS_DIR, skills);

  // Load from project dir (overrides globals with same name)
  const projectSkillsDir = join(cwd, '.grok-code', 'skills');
  loadFromDir(projectSkillsDir, skills);

  return skills;
}

function loadFromDir(dir: string, skills: Skill[]): void {
  if (!existsSync(dir)) return;

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const filePath = join(dir, file);
        const raw = readFileSync(filePath, 'utf-8');
        const skill = parseSkill(raw, filePath);
        if (skill) {
          // Override existing skill with same name
          const existing = skills.findIndex(s => s.name === skill.name);
          if (existing >= 0) {
            skills[existing] = skill;
          } else {
            skills.push(skill);
          }
        }
      } catch { /* skip malformed skills */ }
    }
  } catch { /* dir not readable */ }
}

function parseSkill(content: string, filePath: string): Skill | null {
  // Parse YAML-like frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    // No frontmatter — use filename as name
    return {
      name: basename(filePath, '.md'),
      description: '',
      content: content,
      source: filePath,
    };
  }

  const frontmatter = match[1];
  const body = match[2];

  const name = extractField(frontmatter, 'name') || basename(filePath, '.md');
  const description = extractField(frontmatter, 'description') || '';
  const trigger = extractField(frontmatter, 'trigger') || undefined;

  return { name, description, trigger, content: body.trim(), source: filePath };
}

function extractField(frontmatter: string, field: string): string | null {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

export function getSkillsContext(skills: Skill[]): string {
  if (skills.length === 0) return '';

  const lines = skills.map(s => `- **${s.name}**${s.description ? `: ${s.description}` : ''}${s.trigger ? ` (trigger: "${s.trigger}")` : ''}`);
  return `\n\n## Available Skills\nYou have access to these skills. When a user's request matches a skill, follow its instructions:\n${lines.join('\n')}`;
}

export function findSkill(skills: Skill[], query: string): Skill | null {
  // Exact name match
  const exact = skills.find(s => s.name.toLowerCase() === query.toLowerCase());
  if (exact) return exact;

  // Trigger match
  const triggered = skills.find(s => s.trigger && query.toLowerCase().includes(s.trigger.toLowerCase()));
  if (triggered) return triggered;

  return null;
}

export function ensureSkillsDirs(): void {
  if (!existsSync(GLOBAL_SKILLS_DIR)) {
    mkdirSync(GLOBAL_SKILLS_DIR, { recursive: true });
  }
}

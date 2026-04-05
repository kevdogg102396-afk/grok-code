import { registerTool } from './registry.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code', 'data');
const MEMORY_FILE = join(MEMORY_DIR, 'memory.json');

interface MemoryEntry {
  key: string;
  value: string;
  category: string;
  created: string;
  updated: string;
}

function loadMemories(): MemoryEntry[] {
  if (!existsSync(MEMORY_FILE)) return [];
  try { return JSON.parse(readFileSync(MEMORY_FILE, 'utf-8')); } catch { return []; }
}

function saveMemories(memories: MemoryEntry[]): void {
  if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
  writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

registerTool({
  name: 'memory',
  description: 'Persistent memory that survives across sessions. Actions: remember (save), recall (get), forget (delete), list (show all). Use categories to organize.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['remember', 'recall', 'forget', 'list'], description: 'Action to perform' },
      key: { type: 'string', description: 'Memory key (for remember/recall/forget)' },
      value: { type: 'string', description: 'Value to remember' },
      category: { type: 'string', description: 'Category (default: "general")' },
    },
    required: ['action'],
  },
  async execute(args) {
    const memories = loadMemories();
    const now = new Date().toISOString();

    switch (args.action) {
      case 'remember': {
        if (!args.key || !args.value) return { output: '', error: 'Need key and value' };
        const existing = memories.find((m) => m.key === args.key);
        if (existing) {
          existing.value = args.value;
          existing.category = args.category || existing.category;
          existing.updated = now;
        } else {
          memories.push({ key: args.key, value: args.value, category: args.category || 'general', created: now, updated: now });
        }
        saveMemories(memories);
        return { output: `Remembered: ${args.key}` };
      }
      case 'recall': {
        if (args.key) {
          const entry = memories.find((m) => m.key === args.key);
          return { output: entry ? `${entry.key}: ${entry.value} [${entry.category}]` : `No memory for "${args.key}"` };
        }
        if (args.category) {
          const filtered = memories.filter((m) => m.category === args.category);
          return { output: filtered.length ? filtered.map((m) => `${m.key}: ${m.value}`).join('\n') : `No memories in category "${args.category}"` };
        }
        return { output: '', error: 'Provide key or category' };
      }
      case 'forget': {
        const idx = memories.findIndex((m) => m.key === args.key);
        if (idx === -1) return { output: `No memory "${args.key}" to forget` };
        memories.splice(idx, 1);
        saveMemories(memories);
        return { output: `Forgot: ${args.key}` };
      }
      case 'list': {
        if (memories.length === 0) return { output: 'No memories stored.' };
        const lines = memories.map((m) => `[${m.category}] ${m.key}: ${m.value.slice(0, 100)}`);
        return { output: lines.join('\n') };
      }
      default:
        return { output: '', error: `Unknown action: ${args.action}` };
    }
  },
});

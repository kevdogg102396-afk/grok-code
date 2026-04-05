import { registerTool } from './registry.js';

const notebooks = new Map<string, string[]>();

registerTool({
  name: 'notebook',
  description: 'A persistent scratchpad for the current session. Use to save code snippets, intermediate results, plans, or notes you want to reference later.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['write', 'read', 'append', 'clear'], description: 'Action to perform' },
      content: { type: 'string', description: 'Content to write/append' },
      key: { type: 'string', description: 'Section key (default: "default")' },
    },
    required: ['action'],
  },
  async execute(args, context) {
    const key = args.key || 'default';
    const sessionKey = `${context.sessionId || 'default'}:${key}`;

    switch (args.action) {
      case 'write':
        notebooks.set(sessionKey, [args.content || '']);
        return { output: `Notebook "${key}" updated.` };
      case 'append':
        if (!notebooks.has(sessionKey)) notebooks.set(sessionKey, []);
        notebooks.get(sessionKey)!.push(args.content || '');
        return { output: `Appended to notebook "${key}".` };
      case 'read': {
        const entries = notebooks.get(sessionKey);
        if (!entries || entries.length === 0) return { output: `Notebook "${key}" is empty.` };
        return { output: entries.join('\n---\n') };
      }
      case 'clear':
        notebooks.delete(sessionKey);
        return { output: `Notebook "${key}" cleared.` };
      default:
        return { output: '', error: `Unknown action: ${args.action}` };
    }
  },
});

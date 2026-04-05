import { registerTool } from './registry.js';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

const todos = new Map<string, TodoItem[]>();

function getTodos(sessionId: string): TodoItem[] {
  if (!todos.has(sessionId)) todos.set(sessionId, []);
  return todos.get(sessionId)!;
}

registerTool({
  name: 'todo',
  description: 'Manage a task list for the current session. Actions: add, complete, remove, list.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'complete', 'remove', 'list'], description: 'Action to perform' },
      text: { type: 'string', description: 'Task text (for add)' },
      id: { type: 'number', description: 'Task ID (for complete/remove)' },
    },
    required: ['action'],
  },
  async execute(args, context) {
    const list = getTodos(context.sessionId || 'default');
    switch (args.action) {
      case 'add': {
        const id = list.length + 1;
        list.push({ id, text: args.text || 'Untitled task', done: false });
        return { output: `Added task #${id}: ${args.text}` };
      }
      case 'complete': {
        const item = list.find((t) => t.id === args.id);
        if (!item) return { output: '', error: `Task #${args.id} not found` };
        item.done = true;
        return { output: `Completed task #${args.id}: ${item.text}` };
      }
      case 'remove': {
        const idx = list.findIndex((t) => t.id === args.id);
        if (idx === -1) return { output: '', error: `Task #${args.id} not found` };
        const removed = list.splice(idx, 1)[0];
        return { output: `Removed task #${removed.id}: ${removed.text}` };
      }
      case 'list': {
        if (list.length === 0) return { output: 'No tasks.' };
        const lines = list.map((t) => `${t.done ? '[x]' : '[ ]'} #${t.id}: ${t.text}`);
        return { output: lines.join('\n') };
      }
      default:
        return { output: '', error: `Unknown action: ${args.action}` };
    }
  },
});

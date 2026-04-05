import { registerTool } from './registry.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

registerTool({
  name: 'write',
  description: 'Write content to a file. Creates parent directories if needed. Overwrites existing files.',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to write to' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['file_path', 'content'],
  },
  async execute(args, context) {
    const filePath = resolve(context.cwd, args.file_path.replace(/^~/, process.env.HOME || process.env.USERPROFILE || ''));
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, args.content, 'utf-8');
      return { title: `write: ${args.file_path}`, output: `Wrote ${args.content.length} bytes to ${filePath}` };
    } catch (err: any) {
      return { output: '', error: `Failed to write ${filePath}: ${err.message}` };
    }
  },
});

import { registerTool } from './registry.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

registerTool({
  name: 'read',
  description: 'Read a file and return its contents with line numbers. Supports offset and limit for reading portions of large files.',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the file to read (absolute or relative to cwd)' },
      offset: { type: 'number', description: 'Line number to start reading from (1-based)' },
      limit: { type: 'number', description: 'Maximum number of lines to read' },
    },
    required: ['file_path'],
  },
  async execute(args, context) {
    const filePath = resolve(context.cwd, args.file_path.replace(/^~/, process.env.HOME || process.env.USERPROFILE || ''));
    if (!existsSync(filePath)) {
      return { output: '', error: `File not found: ${filePath}` };
    }
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const offset = Math.max(1, args.offset || 1);
      const limit = args.limit || lines.length;
      const selected = lines.slice(offset - 1, offset - 1 + limit);
      const numbered = selected.map((line, i) => `${offset + i}\t${line}`).join('\n');
      return {
        title: `read: ${args.file_path}`,
        output: numbered.slice(0, 200000),
      };
    } catch (err: any) {
      return { output: '', error: `Failed to read ${filePath}: ${err.message}` };
    }
  },
});

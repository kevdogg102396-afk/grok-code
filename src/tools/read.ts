import { registerTool } from './registry.js';
import { readFileSync, existsSync, statSync, createReadStream } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

// Files larger than this are not loaded whole — require offset+limit
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB

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
      const stat = statSync(filePath);
      const offset = Math.max(1, args.offset || 1);
      const limit = args.limit || Infinity;

      // For large files, stream line-by-line instead of loading the whole thing.
      // Prevents OOM on multi-GB logs, and unbounded reads without offset/limit.
      if (stat.size > LARGE_FILE_THRESHOLD) {
        if (!args.limit) {
          return {
            output: '',
            error: `File is ${(stat.size / 1024 / 1024).toFixed(1)}MB (>10MB threshold). Please call read with an explicit 'limit' (and 'offset' if needed) to avoid loading the whole file.`,
          };
        }
        const collected: string[] = [];
        const rl = createInterface({ input: createReadStream(filePath, { encoding: 'utf-8' }), crlfDelay: Infinity });
        let i = 0;
        for await (const line of rl) {
          i++;
          if (i < offset) continue;
          if (collected.length >= limit) { rl.close(); break; }
          collected.push(`${i}\t${line}`);
        }
        return {
          title: `read: ${args.file_path} (streamed)`,
          output: collected.join('\n').slice(0, 200000),
        };
      }

      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const selected = lines.slice(offset - 1, offset - 1 + (args.limit || lines.length));
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

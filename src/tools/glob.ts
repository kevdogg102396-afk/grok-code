import { registerTool } from './registry.js';
import { Glob } from 'bun';
import { resolve } from 'path';

registerTool({
  name: 'glob',
  description: 'Find files matching a glob pattern. Returns file paths sorted by modification time. Supports patterns like "**/*.ts", "src/**/*.tsx".',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern to match files' },
      path: { type: 'string', description: 'Directory to search in (default: cwd)' },
    },
    required: ['pattern'],
  },
  async execute(args, context) {
    const searchDir = args.path ? resolve(context.cwd, args.path) : context.cwd;
    try {
      const glob = new Glob(args.pattern);
      const matches: string[] = [];
      for await (const file of glob.scan({ cwd: searchDir, absolute: false })) {
        matches.push(file);
        if (matches.length >= 500) break;
      }
      if (matches.length === 0) {
        return { title: 'glob', output: `No files matching "${args.pattern}" in ${searchDir}` };
      }
      return { title: `glob: ${args.pattern}`, output: matches.join('\n') };
    } catch (err: any) {
      return { output: '', error: `Glob failed: ${err.message}` };
    }
  },
});

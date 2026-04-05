import { registerTool } from './registry.js';
import { resolve } from 'path';

registerTool({
  name: 'grep',
  description: 'Search file contents for a regex pattern. Uses ripgrep if available, falls back to built-in. Returns matching lines with file paths and line numbers.',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for' },
      path: { type: 'string', description: 'File or directory to search (default: cwd)' },
      glob: { type: 'string', description: 'File glob filter (e.g. "*.ts", "*.{js,tsx}")' },
      ignore_case: { type: 'boolean', description: 'Case insensitive search' },
      max_results: { type: 'number', description: 'Max results to return (default: 100)' },
    },
    required: ['pattern'],
  },
  async execute(args, context) {
    const searchPath = args.path ? resolve(context.cwd, args.path) : context.cwd;
    const maxResults = args.max_results || 100;

    // Try ripgrep first (fast)
    try {
      const rgArgs = ['rg', '--no-heading', '--line-number', '--color=never', '-m', String(maxResults)];
      if (args.ignore_case) rgArgs.push('-i');
      if (args.glob) rgArgs.push('--glob', args.glob);
      rgArgs.push(args.pattern, searchPath);

      const result = Bun.spawnSync(rgArgs, { timeout: 30000 });
      const stdout = result.stdout?.toString().trim() || '';
      if (result.exitCode === 0 && stdout) {
        return { title: `grep: ${args.pattern}`, output: stdout.slice(0, 100000) };
      }
      if (result.exitCode === 1) {
        return { title: `grep: ${args.pattern}`, output: 'No matches found.' };
      }
    } catch {
      // ripgrep not available, fall back
    }

    // Fallback: basic grep via bash
    try {
      const grepArgs = ['grep', '-rn', '--color=never'];
      if (args.ignore_case) grepArgs.push('-i');
      if (args.glob) grepArgs.push('--include', args.glob);
      grepArgs.push(args.pattern, searchPath);

      const result = Bun.spawnSync(grepArgs, { timeout: 30000 });
      const stdout = result.stdout?.toString().trim() || '';
      if (stdout) {
        const lines = stdout.split('\n').slice(0, maxResults);
        return { title: `grep: ${args.pattern}`, output: lines.join('\n') };
      }
      return { title: `grep: ${args.pattern}`, output: 'No matches found.' };
    } catch (err: any) {
      return { output: '', error: `Grep failed: ${err.message}` };
    }
  },
});

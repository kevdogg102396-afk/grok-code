import { registerTool } from './registry.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

registerTool({
  name: 'edit',
  description: 'Replace an exact string in a file with new content. The old_string must match exactly (including whitespace/indentation).',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the file to edit' },
      old_string: { type: 'string', description: 'The exact string to find and replace' },
      new_string: { type: 'string', description: 'The replacement string' },
      replace_all: { type: 'boolean', description: 'Replace all occurrences (default: false)' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  },
  async execute(args, context) {
    const filePath = resolve(context.cwd, args.file_path.replace(/^~/, process.env.HOME || process.env.USERPROFILE || ''));
    if (!existsSync(filePath)) {
      return { output: '', error: `File not found: ${filePath}` };
    }
    try {
      let content = readFileSync(filePath, 'utf-8');
      if (!content.includes(args.old_string)) {
        return { output: '', error: `old_string not found in ${args.file_path}. Make sure whitespace and indentation match exactly.` };
      }
      const count = content.split(args.old_string).length - 1;
      if (count > 1 && !args.replace_all) {
        return { output: '', error: `old_string found ${count} times. Set replace_all: true to replace all, or provide more context to make it unique.` };
      }
      if (args.replace_all) {
        content = content.split(args.old_string).join(args.new_string);
      } else {
        const idx = content.indexOf(args.old_string);
        content = content.slice(0, idx) + args.new_string + content.slice(idx + args.old_string.length);
      }
      writeFileSync(filePath, content, 'utf-8');
      return { title: `edit: ${args.file_path}`, output: `Replaced ${args.replace_all ? count : 1} occurrence(s) in ${args.file_path}` };
    } catch (err: any) {
      return { output: '', error: `Edit failed: ${err.message}` };
    }
  },
});

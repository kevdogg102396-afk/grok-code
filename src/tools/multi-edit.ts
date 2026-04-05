import { registerTool } from './registry.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

registerTool({
  name: 'multi_edit',
  description: 'Apply multiple string replacements to a file in one operation. Each edit has old_string and new_string.',
  parameters: {
    type: 'object',
    properties: {
      file_path: { type: 'string', description: 'Path to the file' },
      edits: {
        type: 'array',
        description: 'Array of edits to apply in order',
        items: {
          type: 'object',
          properties: {
            old_string: { type: 'string' },
            new_string: { type: 'string' },
          },
          required: ['old_string', 'new_string'],
        },
      },
    },
    required: ['file_path', 'edits'],
  },
  async execute(args, context) {
    const filePath = resolve(context.cwd, args.file_path.replace(/^~/, process.env.HOME || process.env.USERPROFILE || ''));
    if (!existsSync(filePath)) return { output: '', error: `File not found: ${filePath}` };
    try {
      let content = readFileSync(filePath, 'utf-8');
      const results: string[] = [];
      for (let i = 0; i < args.edits.length; i++) {
        const { old_string, new_string } = args.edits[i];
        if (!content.includes(old_string)) {
          results.push(`Edit ${i + 1}: old_string not found, skipped`);
          continue;
        }
        content = content.replace(old_string, new_string);
        results.push(`Edit ${i + 1}: applied`);
      }
      writeFileSync(filePath, content, 'utf-8');
      return { title: `multi_edit: ${args.file_path}`, output: results.join('\n') };
    } catch (err: any) {
      return { output: '', error: `Multi-edit failed: ${err.message}` };
    }
  },
});

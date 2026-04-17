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
    if (!Array.isArray(args.edits) || args.edits.length === 0) {
      return { output: '', error: 'edits must be a non-empty array' };
    }
    try {
      const original = readFileSync(filePath, 'utf-8');
      let content = original;
      const results: string[] = [];
      const failures: string[] = [];

      // All-or-nothing: apply every edit on a working copy. If ANY edit fails,
      // discard the working copy and leave the file on disk untouched.
      for (let i = 0; i < args.edits.length; i++) {
        const { old_string, new_string } = args.edits[i];
        if (typeof old_string !== 'string' || typeof new_string !== 'string') {
          failures.push(`Edit ${i + 1}: old_string/new_string must be strings`);
          continue;
        }
        if (!content.includes(old_string)) {
          failures.push(`Edit ${i + 1}: old_string not found`);
          continue;
        }
        content = content.replace(old_string, new_string);
        results.push(`Edit ${i + 1}: applied`);
      }

      if (failures.length > 0) {
        return {
          output: '',
          error: `Multi-edit aborted — no changes written. ${failures.length}/${args.edits.length} edit(s) failed:\n${failures.join('\n')}`,
        };
      }

      writeFileSync(filePath, content, 'utf-8');
      return { title: `multi_edit: ${args.file_path}`, output: results.join('\n') };
    } catch (err: any) {
      return { output: '', error: `Multi-edit failed: ${err.message}` };
    }
  },
});

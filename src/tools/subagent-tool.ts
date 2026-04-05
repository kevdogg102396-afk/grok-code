import { registerTool } from './registry.js';
import { SubAgentManager } from '../core/subagent.js';
import { requirePro } from '../core/license.js';

let manager: SubAgentManager | null = null;

export function setSubAgentManager(mgr: SubAgentManager): void {
  manager = mgr;
}

registerTool({
  name: 'subagent',
  description: 'Dispatch a task to a sub-agent running on a different Grok model. Use "fast" for quick tasks, "reason" for complex analysis, "standard" for general coding. The sub-agent has access to all the same tools.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['dispatch', 'list_models', 'auto'], description: 'dispatch = run task on specific model, auto = auto-pick best model, list_models = show options' },
      task: { type: 'string', description: 'Task description for dispatch/auto' },
      model: { type: 'string', description: 'Model: "fast" (Grok Code Fast), "standard" (Grok 4.20), "reason" (Grok 4.20 Reason)' },
    },
    required: ['action'],
  },
  async execute(args) {
    if (!manager) {
      return { output: '', error: 'Sub-agent system not initialized. Restart grok-code.' };
    }

    if (args.action === 'list_models') {
      const roles = manager.listRoles();
      const lines = roles.map(r => `  ${r.key} — ${r.name} (${r.model})`);
      return { output: `Available sub-agent models:\n${lines.join('\n')}` };
    }

    if (args.action === 'auto' || args.action === 'dispatch') {
      const gate = requirePro('Sub-agent dispatch');
      if (gate) return { output: gate };
      if (!args.task) return { output: '', error: 'Need a task description' };

      const modelKey = args.action === 'auto'
        ? SubAgentManager.pickBestModel(args.task)
        : (args.model || 'standard');

      try {
        const result = await manager.dispatch(modelKey, args.task);
        if (result.error) {
          return { output: result.text || '', error: `Sub-agent error: ${result.error}` };
        }
        return {
          output: `[Sub-agent ${modelKey} completed]\n\n${result.text}`,
        };
      } catch (err: any) {
        return { output: '', error: `Sub-agent failed: ${err.message}` };
      }
    }

    return { output: '', error: `Unknown action: ${args.action}` };
  },
});

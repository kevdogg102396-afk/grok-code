import { registerTool } from './registry.js';

registerTool({
  name: 'think',
  description: 'Use this tool to think through complex problems step by step. Your thoughts are private and not shown to the user. Use this before making important decisions, when you need to break down a complex task, or when you want to reason about the best approach.',
  parameters: {
    type: 'object',
    properties: {
      thought: { type: 'string', description: 'Your reasoning, analysis, or step-by-step thought process' },
    },
    required: ['thought'],
  },
  async execute(args) {
    return { output: `Thought recorded (${args.thought.length} chars). Continue with your plan.` };
  },
});

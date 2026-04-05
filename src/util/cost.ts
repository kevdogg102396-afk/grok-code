import { MODELS, MODEL_ALIASES } from '../provider/models.js';

export function calculateCost(modelAlias: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  const resolved = MODEL_ALIASES[modelAlias] || modelAlias;
  const model = MODELS[resolved];
  if (!model) return 0;
  const inputCost = (usage.prompt_tokens / 1000) * model.costPer1kIn;
  const outputCost = (usage.completion_tokens / 1000) * model.costPer1kOut;
  return inputCost + outputCost;
}

export function formatCost(dollars: number): string {
  if (dollars === 0) return '$0.00';
  if (dollars < 0.01) return `<$0.01`;
  return `$${dollars.toFixed(2)}`;
}

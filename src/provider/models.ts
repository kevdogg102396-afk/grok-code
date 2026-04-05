export interface ModelDefinition {
  id: string;
  name: string;
  context: number;
  vision: 'xai' | null;
  reasoning: boolean;
  costPer1kIn: number;
  costPer1kOut: number;
}

export const MODELS: Record<string, ModelDefinition> = {
  'grok-4.20': {
    id: 'grok-4.20-0309-non-reasoning',
    name: 'Grok 4.20',
    context: 131072,
    vision: 'xai',
    reasoning: false,
    costPer1kIn: 0.002,
    costPer1kOut: 0.010,
  },
  'grok-4.20-reason': {
    id: 'grok-4.20-0309-reasoning',
    name: 'Grok 4.20 Reason',
    context: 131072,
    vision: 'xai',
    reasoning: true,
    costPer1kIn: 0.003,
    costPer1kOut: 0.015,
  },
  'grok-code-fast': {
    id: 'grok-code-fast-1',
    name: 'Grok Code Fast',
    context: 131072,
    vision: 'xai',
    reasoning: false,
    costPer1kIn: 0.0002,
    costPer1kOut: 0.001,
  },
};

export const DEFAULT_MODEL = 'grok-4.20';
export const MODEL_ALIASES: Record<string, string> = {
  'fast': 'grok-code-fast',
  'reason': 'grok-4.20-reason',
  'standard': 'grok-4.20',
  'default': 'grok-4.20',
};

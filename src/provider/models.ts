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
  'grok-4.3': {
    id: 'grok-4.3',
    name: 'Grok 4.3',
    context: 1048576,
    vision: 'xai',
    reasoning: true,
    costPer1kIn: 0.00125,
    costPer1kOut: 0.0025,
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
  '4.3': 'grok-4.3',
  'grok43': 'grok-4.3',
  'latest': 'grok-4.3',
  'reason': 'grok-4.20-reason',
  'standard': 'grok-4.20',
  'default': 'grok-4.20',
};

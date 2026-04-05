import { MODELS, DEFAULT_MODEL, MODEL_ALIASES, type ModelDefinition } from './models.js';
import { parseSSELine, ToolCallAssembler, type AssembledToolCall } from './stream-parser.js';
import { decodeObjectEntities } from './html-entities.js';

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  maxRetries?: number;
}

export interface StreamOptions {
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}

export interface StreamResponse {
  content: string;
  toolCalls: AssembledToolCall[];
  finishReason: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | ContentPart[];
  tool_calls?: AssembledToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: string } };

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export class Provider {
  readonly apiKey: string;
  readonly baseUrl: string;
  private modelAlias: string;
  private modelDef: ModelDefinition;
  readonly maxTokens: number;
  private maxRetries: number;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.XAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.x.ai';
    this.maxTokens = config.maxTokens || 16384;
    this.maxRetries = config.maxRetries ?? 3;

    const alias = config.model || DEFAULT_MODEL;
    this.modelAlias = MODEL_ALIASES[alias] || alias;
    this.modelDef = MODELS[this.modelAlias];
    if (!this.modelDef) {
      throw new Error(`Unknown model: ${alias}. Available: ${Object.keys(MODELS).join(', ')}`);
    }
  }

  get modelName(): string { return this.modelDef.name; }
  get modelID(): string { return this.modelDef.id; }
  get modelContext(): number { return this.modelDef.context; }
  get supportsVision(): boolean { return !!this.modelDef.vision; }
  get isReasoning(): boolean { return this.modelDef.reasoning; }
  get currentAlias(): string { return this.modelAlias; }

  switchModel(alias: string): boolean {
    const resolved = MODEL_ALIASES[alias] || alias;
    if (MODELS[resolved]) {
      this.modelAlias = resolved;
      this.modelDef = MODELS[resolved];
      return true;
    }
    return false;
  }

  listModels() {
    return Object.entries(MODELS).map(([alias, def]) => ({
      alias,
      ...def,
      active: alias === this.modelAlias,
    }));
  }

  formatVisionContent(text: string, base64Image: string, mimeType = 'image/png'): ContentPart[] {
    return [
      { type: 'text', text },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' } },
    ];
  }

  async streamComplete(
    messages: Message[],
    tools: ToolSchema[] = [],
    options: StreamOptions = {}
  ): Promise<StreamResponse> {
    const body: Record<string, any> = {
      model: this.modelDef.id,
      messages,
      max_tokens: this.maxTokens,
      stream: true,
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((r) => setTimeout(r, delay));
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: options.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          if (response.status === 429 || response.status >= 500) {
            lastError = new Error(`xAI API error ${response.status}: ${errorBody.slice(0, 200)}`);
            continue; // retry
          }
          throw new Error(`xAI API error ${response.status}: ${errorBody.slice(0, 500)}`);
        }

        if (!response.body) throw new Error('No response body');

        let content = '';
        let finishReason = '';
        let usage = { prompt_tokens: 0, completion_tokens: 0 };
        const assembler = new ToolCallAssembler();
        let buffer = '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') {
              if (trimmed === 'data: [DONE]') continue;
              continue;
            }

            const chunk = parseSSELine(trimmed);
            if (!chunk) continue;

            if (chunk.type === 'text' && chunk.text) {
              content += chunk.text;
              options.onChunk?.(chunk.text);
            } else if (chunk.type === 'tool_call_start' || chunk.type === 'tool_call_delta') {
              assembler.feed(chunk);
            } else if (chunk.type === 'done') {
              if (chunk.finishReason) finishReason = chunk.finishReason;
              if (chunk.usage) usage = chunk.usage;
            }
          }
        }

        return {
          content,
          toolCalls: assembler.getToolCalls(),
          finishReason: finishReason || 'stop',
          usage,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        lastError = err;
        if (attempt >= this.maxRetries) break;
      }
    }

    throw lastError || new Error('Provider request failed after retries');
  }
}

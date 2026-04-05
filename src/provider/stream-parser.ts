export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'done' | 'error';
  text?: string;
  toolCallIndex?: number;
  toolCallId?: string;
  functionName?: string;
  argumentsDelta?: string;
  finishReason?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
  error?: string;
}

export function parseSSELine(line: string): StreamChunk | null {
  if (!line.startsWith('data: ')) return null;
  const data = line.slice(6).trim();
  if (data === '[DONE]') return { type: 'done' };

  try {
    const json = JSON.parse(data);
    const choice = json.choices?.[0];
    if (!choice) {
      if (json.usage) return { type: 'done', usage: json.usage };
      return null;
    }

    const delta = choice.delta;
    if (!delta) {
      return choice.finish_reason
        ? { type: 'done', finishReason: choice.finish_reason, usage: json.usage }
        : null;
    }

    // Text content
    if (delta.content) {
      return { type: 'text', text: delta.content };
    }

    // Tool calls
    if (delta.tool_calls) {
      const tc = delta.tool_calls[0];
      if (tc.function?.name) {
        return {
          type: 'tool_call_start',
          toolCallIndex: tc.index ?? 0,
          toolCallId: tc.id,
          functionName: tc.function.name,
          argumentsDelta: tc.function.arguments || '',
        };
      }
      if (tc.function?.arguments) {
        return {
          type: 'tool_call_delta',
          toolCallIndex: tc.index ?? 0,
          argumentsDelta: tc.function.arguments,
        };
      }
    }

    // Finish reason
    if (choice.finish_reason) {
      return { type: 'done', finishReason: choice.finish_reason, usage: json.usage };
    }

    return null;
  } catch {
    return { type: 'error', error: `Failed to parse SSE: ${data.slice(0, 100)}` };
  }
}

export interface AssembledToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export class ToolCallAssembler {
  private calls: Map<number, { id: string; name: string; args: string }> = new Map();

  feed(chunk: StreamChunk): void {
    if (chunk.type === 'tool_call_start') {
      this.calls.set(chunk.toolCallIndex!, {
        id: chunk.toolCallId || `call_${Date.now()}_${chunk.toolCallIndex}`,
        name: chunk.functionName!,
        args: chunk.argumentsDelta || '',
      });
    } else if (chunk.type === 'tool_call_delta') {
      const existing = this.calls.get(chunk.toolCallIndex!);
      if (existing) {
        existing.args += chunk.argumentsDelta || '';
      }
    }
  }

  getToolCalls(): AssembledToolCall[] {
    return Array.from(this.calls.values()).map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.args },
    }));
  }

  hasToolCalls(): boolean {
    return this.calls.size > 0;
  }

  reset(): void {
    this.calls.clear();
  }
}

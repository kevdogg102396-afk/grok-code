export interface ContextManagerConfig {
  maxTokens: number;
  compactThreshold?: number;
  keepRecentMessages?: number;
}

interface Message {
  role: string;
  content?: string | any[];
  tool_calls?: any[];
  tool_call_id?: string;
}

export class ContextManager {
  private maxTokens: number;
  private compactThreshold: number;
  private keepRecent: number;

  constructor(config: ContextManagerConfig) {
    this.maxTokens = config.maxTokens;
    this.compactThreshold = config.compactThreshold ?? 0.7;
    this.keepRecent = config.keepRecentMessages ?? 12;
  }

  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  estimateMessageTokens(msg: Message): number {
    let tokens = 4; // message overhead
    if (typeof msg.content === 'string') {
      tokens += this.estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.text) tokens += this.estimateTokens(part.text);
        if (part.image_url) tokens += 1000; // approximate for images
      }
    }
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        tokens += this.estimateTokens(tc.function?.name || '');
        tokens += this.estimateTokens(tc.function?.arguments || '');
      }
    }
    return tokens;
  }

  estimateConversationTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateMessageTokens(m), 0);
  }

  needsCompaction(messages: Message[]): boolean {
    const tokens = this.estimateConversationTokens(messages);
    return tokens > this.maxTokens * this.compactThreshold;
  }

  compact(messages: Message[]): Message[] {
    if (messages.length <= this.keepRecent + 1) return messages;

    // Keep system message (first)
    const systemMsg = messages[0]?.role === 'system' ? messages[0] : null;
    const conversation = systemMsg ? messages.slice(1) : messages;

    // Keep recent messages
    const recent = conversation.slice(-this.keepRecent);
    const old = conversation.slice(0, -this.keepRecent);

    // Summarize old messages
    const summaryParts: string[] = [];
    for (const msg of old) {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        summaryParts.push(`User: ${msg.content.slice(0, 150)}`);
      } else if (msg.role === 'assistant') {
        if (msg.tool_calls) {
          const toolNames = msg.tool_calls.map((tc: any) => tc.function?.name).join(', ');
          summaryParts.push(`Assistant used tools: ${toolNames}`);
        } else if (typeof msg.content === 'string') {
          summaryParts.push(`Assistant: ${msg.content.slice(0, 150)}`);
        }
      } else if (msg.role === 'tool') {
        const content = typeof msg.content === 'string' ? msg.content : '';
        summaryParts.push(`Tool result: ${content.slice(0, 100)}`);
      }
    }

    const summaryMessage: Message = {
      role: 'user',
      content: `[Context compacted — ${old.length} earlier messages summarized]\n${summaryParts.join('\n')}`,
    };

    const result: Message[] = [];
    if (systemMsg) result.push(systemMsg);
    result.push(summaryMessage);
    result.push(...recent);

    return result;
  }
}

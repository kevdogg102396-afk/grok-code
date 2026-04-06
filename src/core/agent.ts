import { getToolSchemas, executeTool, type ToolContext, type ToolResult } from '../tools/registry.js';
import { ContextManager } from './context.js';
import { decodeObjectEntities } from '../provider/html-entities.js';
import type { Provider, Message, StreamResponse } from '../provider/provider.js';
import type { AssembledToolCall } from '../provider/stream-parser.js';

const DEFAULT_MAX_TOOL_LOOPS = 30;
const DEFAULT_TOOL_TIMEOUT = 120000;
const MAX_TOOL_RESULT_CHARS = 100000; // 100KB max per tool result to prevent memory blow-up
const MAX_TOTAL_TOOL_RESULT_CHARS = 2_000_000; // 2MB total tool results per session

export interface AgentConfig {
  provider: Provider;
  systemPrompt: string;
  cwd: string;
  maxToolLoops?: number;
  toolTimeout?: number;
  maxContextTokens?: number;
  sessionId?: string;
  requestPermission?: (toolName: string, args: Record<string, any>) => Promise<boolean>;
  onText?: (text: string) => void;
  onToolStart?: (name: string, args: Record<string, any>) => void;
  onToolEnd?: (name: string, result: ToolResult) => void;
  onError?: (error: Error) => void;
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number }) => void;
}

export interface AgentRunResult {
  text: string;
  toolResults: Array<{ tool: string; args?: Record<string, any>; result?: string; error?: string }>;
  error: string | null;
}

export class Agent {
  private provider: Provider;
  private systemPrompt: string;
  private cwd: string;
  private messages: Message[] = [];
  private context: ContextManager;
  private maxToolLoops: number;
  private toolTimeout: number;
  private sessionId: string;
  private totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
  private totalToolResultChars = 0;
  private requestPermission?: (toolName: string, args: Record<string, any>) => Promise<boolean>;

  // Callbacks
  private onText: (text: string) => void;
  private onToolStart: (name: string, args: Record<string, any>) => void;
  private onToolEnd: (name: string, result: ToolResult) => void;
  private onError: (error: Error) => void;
  private onUsage: (usage: { prompt_tokens: number; completion_tokens: number }) => void;

  constructor(config: AgentConfig) {
    this.provider = config.provider;
    this.systemPrompt = config.systemPrompt;
    this.cwd = config.cwd;
    this.maxToolLoops = config.maxToolLoops ?? DEFAULT_MAX_TOOL_LOOPS;
    this.toolTimeout = config.toolTimeout ?? DEFAULT_TOOL_TIMEOUT;
    this.sessionId = config.sessionId || `session_${Date.now()}`;
    this.requestPermission = config.requestPermission;
    this.context = new ContextManager({ maxTokens: config.maxContextTokens || 100000 });

    this.onText = config.onText || (() => {});
    this.onToolStart = config.onToolStart || (() => {});
    this.onToolEnd = config.onToolEnd || (() => {});
    this.onError = config.onError || (() => {});
    this.onUsage = config.onUsage || (() => {});
  }

  get stats() {
    return {
      model: this.provider.modelID,
      modelName: this.provider.modelName,
      provider: 'xAI',
      messages: this.messages.length,
      usage: { ...this.totalUsage },
      sessionId: this.sessionId,
    };
  }

  async run(userMessage: string): Promise<AgentRunResult> {
    // Add user message
    this.messages.push({ role: 'user', content: userMessage });

    // Auto-compact if needed
    if (this.context.needsCompaction(this.messages)) {
      this.messages = this.context.compact(this.messages) as Message[];
    }

    const toolResults: AgentRunResult['toolResults'] = [];
    let iterations = 0;
    const maxLoops = this.maxToolLoops || Infinity;
    let consecutiveErrors = 0;
    let lastErrorTool = '';

    while (iterations < maxLoops) {
      iterations++;

      // Build messages array with system prompt
      const allMessages: Message[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.messages,
      ];

      // Get tool schemas
      const tools = getToolSchemas();

      // Stream to model
      let response: StreamResponse;
      try {
        response = await this.provider.streamComplete(allMessages, tools, {
          onChunk: (text) => this.onText(text),
        });
      } catch (err: any) {
        this.onError(err);
        return { text: '', toolResults, error: `Provider error: ${err.message}` };
      }

      // Track usage
      if (response.usage) {
        this.totalUsage.prompt_tokens += response.usage.prompt_tokens;
        this.totalUsage.completion_tokens += response.usage.completion_tokens;
        this.onUsage(this.totalUsage);
      }

      // No tool calls — we're done
      if (response.toolCalls.length === 0) {
        if (response.content) {
          this.messages.push({ role: 'assistant', content: response.content });
        }
        return { text: response.content, toolResults, error: null };
      }

      // Add assistant message with tool calls
      const assistantMsg: Message = { role: 'assistant' };
      if (response.content) assistantMsg.content = response.content;
      assistantMsg.tool_calls = response.toolCalls;
      this.messages.push(assistantMsg);

      // Execute each tool call
      for (const tc of response.toolCalls) {
        let args: Record<string, any>;
        try {
          args = JSON.parse(tc.function.arguments);
          // Decode HTML entities (Grok quirk)
          args = decodeObjectEntities(args);
        } catch {
          args = {};
        }

        const toolName = tc.function.name;
        this.onToolStart(toolName, args);

        // Permission check
        if (this.requestPermission) {
          const allowed = await this.requestPermission(toolName, args);
          if (!allowed) {
            const deniedMsg = `Permission denied for tool "${toolName}". The user (or permission mode) blocked this action. If you are a sub-agent, report this back — the main agent can request user approval.`;
            const deniedResult: ToolResult = { output: deniedMsg };
            this.messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: deniedMsg,
            });
            toolResults.push({ tool: toolName, args, error: 'Permission denied' });
            this.onToolEnd(toolName, deniedResult);
            continue;
          }
        }

        // Execute tool with timeout
        let result: ToolResult;
        try {
          if (this.toolTimeout > 0) {
            result = await Promise.race([
              executeTool(toolName, args, { cwd: this.cwd, sessionId: this.sessionId }),
              new Promise<ToolResult>((_, reject) =>
                setTimeout(() => reject(new Error(`Tool timeout after ${this.toolTimeout}ms`)), this.toolTimeout)
              ),
            ]);
          } else {
            result = await executeTool(toolName, args, { cwd: this.cwd, sessionId: this.sessionId });
          }
        } catch (err: any) {
          result = { output: '', error: `Tool execution error: ${err.message}` };
        }

        // Track consecutive errors on same tool (prevent retry spam)
        if (result.error) {
          if (toolName === lastErrorTool) {
            consecutiveErrors++;
          } else {
            consecutiveErrors = 1;
            lastErrorTool = toolName;
          }
        } else {
          consecutiveErrors = 0;
          lastErrorTool = '';
        }

        // Add tool result to messages
        let resultContent = result.error
          ? `Error: ${result.error}\n${result.output}`
          : result.output;

        // If same tool keeps failing, tell the model to try something different
        if (consecutiveErrors >= 3) {
          resultContent += '\n\n⚠ This tool has failed 3+ times in a row with similar args. STOP retrying the same approach. Try a different strategy: read the file first, use bash instead, or ask the user for help.';
          consecutiveErrors = 0; // reset so it can try again after changing approach
        }

        // Cap individual result size
        resultContent = resultContent.slice(0, MAX_TOOL_RESULT_CHARS);

        // Track total tool result memory — bail if session is consuming too much
        this.totalToolResultChars += resultContent.length;
        if (this.totalToolResultChars > MAX_TOTAL_TOOL_RESULT_CHARS) {
          this.messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: 'Error: Session memory limit reached (2MB of tool results). Summarize your findings and present them to the user. Start fresh if needed.',
          });
          return {
            text: 'Session memory limit reached. Tool results exceeded 2MB total.',
            toolResults,
            error: 'Memory safety limit: total tool results exceeded 2MB',
          };
        }

        this.messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultContent,
        });

        toolResults.push({
          tool: toolName,
          args,
          result: result.output?.slice(0, 1000),
          error: result.error || undefined,
        });

        this.onToolEnd(toolName, result);
      }
    }

    return {
      text: 'Reached maximum tool loop iterations.',
      toolResults,
      error: `Safety limit: ${maxLoops} iterations reached`,
    };
  }

  switchModel(alias: string): boolean {
    return this.provider.switchModel(alias);
  }

  getProvider(): Provider {
    return this.provider;
  }

  reset(): void {
    this.messages = [];
    this.totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
    this.totalToolResultChars = 0;
  }

  exportState() {
    return {
      sessionId: this.sessionId,
      messages: this.messages,
      usage: this.totalUsage,
      model: this.provider.modelID,
      timestamp: new Date().toISOString(),
    };
  }

  importState(state: any) {
    if (state?.messages) this.messages = state.messages;
    if (state?.usage) this.totalUsage = state.usage;
  }
}

import type { MCPServerConfig, MCPTool, MCPRequest, MCPResponse } from './types.js';
import { registerTool } from '../tools/registry.js';
import type { Subprocess } from 'bun';

export class MCPClient {
  private config: MCPServerConfig;
  private process: Subprocess | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; timer: ReturnType<typeof setTimeout> }>();
  private buffer = '';
  private connected = false;
  private stdoutReady: Promise<void> | null = null;
  private stdoutResolve: (() => void) | null = null;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<MCPTool[]> {
    const cmd = [this.config.command, ...(this.config.args || [])];

    this.process = Bun.spawn(cmd, {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, ...this.config.env },
    });

    // Start stdout reader BEFORE sending initialize —
    // fixes race condition where fast MCP server response could be lost
    this.stdoutReady = new Promise(resolve => { this.stdoutResolve = resolve; });
    this.readStdout();
    // Wait for reader to be actively consuming before sending anything
    await this.stdoutReady;

    // Initialize
    await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'grok-code', version: '2.0.0' },
    });

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});

    // List tools
    const result = await this.send('tools/list', {});
    const tools: MCPTool[] = result?.tools || [];

    this.connected = true;
    return tools;
  }

  private async readStdout(): Promise<void> {
    if (!this.process?.stdout) return;
    const stdout = this.process.stdout as ReadableStream<Uint8Array>;

    const reader = stdout.getReader();
    const decoder = new TextDecoder();

    // Signal that the reader is now active and ready to receive data
    this.stdoutResolve?.();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        this.buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIdx: number;
        while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
          const line = this.buffer.slice(0, newlineIdx).trim();
          this.buffer = this.buffer.slice(newlineIdx + 1);
          if (line) this.handleLine(line);
        }
      }
    } catch {
      // Process ended
    }
  }

  private handleLine(line: string): void {
    try {
      const msg: MCPResponse = JSON.parse(line);
      if (msg.id !== undefined) {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          // Clear the timeout timer to prevent leak
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(`MCP error: ${msg.error.message}`));
          } else {
            pending.resolve(msg.result);
          }
        }
      }
    } catch {
      // Non-JSON line, ignore
    }
  }

  private async send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = this.nextId++;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set timeout with cleanup — timer reference stored so handleLine can clear it
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timer });
      const data = JSON.stringify(request) + '\n';
      (this.process?.stdin as import('bun').FileSink | undefined)?.write(data);
    });
  }

  private sendNotification(method: string, params: Record<string, any> = {}): void {
    const msg: MCPRequest = { jsonrpc: '2.0', method, params };
    (this.process?.stdin as import('bun').FileSink | undefined)?.write(JSON.stringify(msg) + '\n');
  }

  async callTool(name: string, args: Record<string, any>): Promise<string> {
    const result = await this.send('tools/call', { name, arguments: args });
    if (result?.content) {
      return result.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }
    return JSON.stringify(result);
  }

  registerTools(tools: MCPTool[]): void {
    for (const tool of tools) {
      const serverName = this.config.name;
      const toolName = `mcp__${serverName}__${tool.name}`;
      const client = this;

      registerTool({
        name: toolName,
        description: `[MCP: ${serverName}] ${tool.description}`,
        parameters: tool.inputSchema,
        async execute(args) {
          try {
            const result = await client.callTool(tool.name, args);
            return { output: result };
          } catch (err: any) {
            return { output: '', error: `MCP tool error: ${err.message}` };
          }
        },
      });
    }
  }

  disconnect(): void {
    // Clean up all pending request timers
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();

    if (this.process) {
      this.process.kill();
      this.process = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

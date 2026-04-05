import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { MCPClient } from './client.js';
import type { MCPServerConfig } from './types.js';

export async function loadMCPServers(cwd: string): Promise<MCPClient[]> {
  const clients: MCPClient[] = [];

  // Check multiple config locations
  const configPaths = [
    resolve(cwd, '.mcp.json'),
    resolve(cwd, 'mcp.json'),
    join(process.env.HOME || process.env.USERPROFILE || '.', '.grok-code', 'mcp.json'),
  ];

  let config: Record<string, MCPServerConfig> = {};

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
        const servers = raw.mcpServers || raw;
        config = { ...config, ...servers };
      } catch (err) {
        console.error(`[MCP] Failed to parse ${configPath}:`, err);
      }
    }
  }

  // Connect to each server
  for (const [name, serverConfig] of Object.entries(config)) {
    if (!serverConfig.command) continue;

    const client = new MCPClient({ ...serverConfig, name });
    try {
      console.error(`[MCP] Connecting to ${name}...`);
      const tools = await client.connect();
      client.registerTools(tools);
      clients.push(client);
      console.error(`[MCP] ${name}: ${tools.length} tools registered`);
    } catch (err) {
      console.error(`[MCP] Failed to connect to ${name}:`, err);
    }
  }

  // Cleanup on exit — kill all MCP server processes
  if (clients.length > 0) {
    const cleanup = () => {
      for (const client of clients) {
        try { client.disconnect(); } catch { /* best effort */ }
      }
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  }

  return clients;
}

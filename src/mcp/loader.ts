import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { MCPClient } from './client.js';
import type { MCPServerConfig } from './types.js';

// Shared registry of active MCP clients — signal handlers below iterate this
// at shutdown time so we can register the handlers exactly once and still
// clean up clients from any number of loadMCPServers() calls.
const activeClients: MCPClient[] = [];
let signalHandlersRegistered = false;

function registerSignalHandlers(): void {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;
  const cleanup = () => {
    for (const client of activeClients.splice(0)) {
      try { client.disconnect(); } catch { /* best effort */ }
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

export async function loadMCPServers(cwd: string, options?: { onUntrustedConfig?: (path: string, servers: string[]) => Promise<boolean> }): Promise<MCPClient[]> {
  const clients: MCPClient[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';

  // Check multiple config locations
  const configPaths = [
    { path: resolve(cwd, '.mcp.json'), trusted: false },
    { path: resolve(cwd, 'mcp.json'), trusted: false },
    { path: join(homeDir, '.grok-code', 'mcp.json'), trusted: true }, // user's own config is always trusted
  ];

  let config: Record<string, MCPServerConfig> = {};

  for (const { path: configPath, trusted } of configPaths) {
    if (existsSync(configPath)) {
      try {
        const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
        const servers = raw.mcpServers || raw;
        const serverNames = Object.keys(servers);

        if (serverNames.length === 0) continue;

        // Warn about project-local MCP configs (potential untrusted repo attack)
        if (!trusted) {
          console.error(`\n\u26a0\ufe0f  [MCP] Found project MCP config: ${configPath}`);
          console.error(`   Servers: ${serverNames.join(', ')}`);
          console.error(`   WARNING: MCP servers execute commands on your machine.`);
          console.error(`   If you didn't create this file, it may be malicious.\n`);

          // If an interactive callback is provided, ask for permission
          if (options?.onUntrustedConfig) {
            const allowed = await options.onUntrustedConfig(configPath, serverNames);
            if (!allowed) {
              console.error(`[MCP] Skipped untrusted config: ${configPath}`);
              continue;
            }
          }
        }

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

  // Register shutdown hooks exactly once, regardless of how many times this
  // function is called. New clients are added to the shared registry.
  if (clients.length > 0) {
    activeClients.push(...clients);
    registerSignalHandlers();
  }

  return clients;
}

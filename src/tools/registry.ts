export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface ToolResult {
  title?: string;
  output: string;
  error?: string;
  _visionImage?: { base64: string; mimeType: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolSchema;
  execute: (args: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  cwd: string;
  sessionId?: string;
}

const tools = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

export function getToolSchemas(): Array<{ type: 'function'; function: { name: string; description: string; parameters: ToolSchema } }> {
  return Array.from(tools.values()).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = tools.get(name);
  if (!tool) {
    return { output: '', error: `Unknown tool: ${name}` };
  }
  try {
    return await tool.execute(args, context);
  } catch (err: any) {
    return { output: '', error: `Tool ${name} failed: ${err.message}` };
  }
}

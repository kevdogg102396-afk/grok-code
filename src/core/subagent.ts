import { Agent, type AgentRunResult } from './agent.js';
import { Provider } from '../provider/provider.js';
import type { Permissions } from '../permissions/permissions.js';

export interface SubAgentRole {
  name: string;
  model: string;
  promptAddition: string;
}

const DEFAULT_ROLES: Record<string, SubAgentRole> = {
  fast: {
    name: 'Fast Coder',
    model: 'grok-code-fast',
    promptAddition: 'You are a fast coding sub-agent. Focus on quick, efficient solutions. Don\'t over-engineer.',
  },
  reason: {
    name: 'Deep Thinker',
    model: 'grok-4.20-reason',
    promptAddition: 'You are a reasoning sub-agent. Think deeply about architecture, edge cases, and correctness. Take your time.',
  },
  standard: {
    name: 'General Coder',
    model: 'grok-4.20',
    promptAddition: 'You are a general-purpose coding sub-agent. Balance speed with quality.',
  },
};

export class SubAgentManager {
  private apiKey: string;
  private cwd: string;
  private basePrompt: string;
  private permissions: Permissions | null;
  private requestPermission?: (toolName: string, args: Record<string, any>) => Promise<boolean>;

  constructor(config: {
    apiKey: string;
    cwd: string;
    basePrompt: string;
    permissions?: Permissions;
    requestPermission?: (toolName: string, args: Record<string, any>) => Promise<boolean>;
  }) {
    this.apiKey = config.apiKey;
    this.cwd = config.cwd;
    this.basePrompt = config.basePrompt;
    this.permissions = config.permissions || null;
    this.requestPermission = config.requestPermission;
  }

  async dispatch(roleKey: string, task: string): Promise<AgentRunResult> {
    const role = DEFAULT_ROLES[roleKey] || DEFAULT_ROLES.standard;

    const provider = new Provider({
      apiKey: this.apiKey,
      model: role.model,
    });

    // Sub-agents inherit parent's permission system
    // They get the same requestPermission callback so sandbox/mode rules apply
    const agent = new Agent({
      provider,
      systemPrompt: `${this.basePrompt}\n\n## Sub-Agent Role: ${role.name}\n${role.promptAddition}\n\nYou are a sub-agent. Complete the task efficiently and return the result. Do not ask questions — work with what you have.`,
      cwd: this.cwd,
      maxToolLoops: 50,
      toolTimeout: 120000,
      requestPermission: this.requestPermission,
    });

    return agent.run(task);
  }

  /** Update the permission callback (called when parent's mode changes) */
  setRequestPermission(fn: (toolName: string, args: Record<string, any>) => Promise<boolean>): void {
    this.requestPermission = fn;
  }

  listRoles(): Array<{ key: string; name: string; model: string }> {
    return Object.entries(DEFAULT_ROLES).map(([key, role]) => ({
      key,
      name: role.name,
      model: role.model,
    }));
  }

  static pickBestModel(task: string): string {
    const lower = task.toLowerCase();
    if (lower.match(/architect|design|refactor|security|review|analyze|debug complex|optimize/)) {
      return 'reason';
    }
    if (lower.match(/fix typo|rename|add comment|simple|quick|small change|format/)) {
      return 'fast';
    }
    return 'standard';
  }
}

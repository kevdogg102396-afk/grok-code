import React, { useState, useCallback } from 'react';
import { Box, useApp, useInput } from 'ink';
import { SplashScreen } from './SplashScreen.js';
import { ChatView, type DisplayMessage } from './ChatView.js';
import { InputBar } from './InputBar.js';
import { StatusBar } from './StatusBar.js';
import { PermissionPrompt } from './PermissionPrompt.js';
import { CharacterPicker } from './CharacterPicker.js';
import type { Agent } from '../core/agent.js';
import { calculateCost } from '../util/cost.js';
import { Permissions, type PermissionMode } from '../permissions/permissions.js';
import { isFirstLaunch, getCompanionId, saveCompanionConfig } from '../core/companion-config.js';
import { COMPANIONS, COMPANION_IDS } from './companions.js';
import { isPro, activateLicense, requirePro } from '../core/license.js';
import { setConfigValue, loadConfig } from '../core/config.js';

const savedConfig = loadConfig();

// Memoize heavy components — prevents re-render when parent state changes
const InputBarMemo = React.memo(InputBar);
const StatusBarMemo = React.memo(StatusBar);

interface AppProps {
  agent: Agent;
  modelAlias: string;
  skipSplash?: boolean;
  initialMode?: 'manual' | 'auto' | 'yolo';
  initialSandbox?: boolean;
}

export function App({ agent, modelAlias, skipSplash, initialMode = 'auto', initialSandbox = false }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [showCharacterPicker, setShowCharacterPicker] = useState(isFirstLaunch());
  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [activeTools, setActiveTools] = useState<Array<{ name: string; args?: Record<string, any>; status: 'running' | 'done' | 'error' }>>([]);
  const [tokensIn, setTokensIn] = useState(0);
  const [tokensOut, setTokensOut] = useState(0);
  const [currentMode, setCurrentMode] = useState<PermissionMode>(initialMode);
  const [isSandboxed, setIsSandboxed] = useState(initialSandbox);
  const [companionId, setCompanionId] = useState(getCompanionId());
  const [lastCompanionEvent, setLastCompanionEvent] = useState<'idle' | 'toolStart' | 'toolDone' | 'error' | 'thinking'>('idle');
  const [companionQuip, setCompanionQuip] = useState<string | undefined>(undefined);
  const permissions = React.useRef(new Permissions({ mode: initialMode, cwd: initialSandbox ? process.cwd() : undefined })).current;
  // Apply initial sandbox if set via CLI flag
  if (initialSandbox && !permissions.isSandboxed()) {
    permissions.toggleSandbox();
    permissions.setJailDir(process.cwd());
  }
  const [permissionRequest, setPermissionRequest] = useState<{
    toolName: string;
    args: Record<string, any>;
    resolve: (allowed: boolean) => void;
  } | null>(null);

  const handleCharacterSelect = useCallback((id: string) => {
    setCompanionId(id);
    saveCompanionConfig({ companionId: id, firstLaunchComplete: true });
    setShowCharacterPicker(false);
  }, []);

  const handleSubmit = useCallback(async (input: string) => {
    // Handle slash commands
    if (input.startsWith('/')) {
      const [cmd, ...rest] = input.slice(1).split(' ');
      const arg = rest.join(' ');

      switch (cmd) {
        case 'quit':
        case 'exit':
          exit();
          return;
        case 'reset':
          agent.reset();
          setMessages([]);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Conversation reset.' }]);
          return;
        case 'model': {
          if (!arg) {
            const models = agent.getProvider().listModels();
            const list = models.map(m => `${m.active ? '> ' : '  '}${m.alias} — ${m.name}`).join('\n');
            setMessages(prev => [...prev, { role: 'assistant', content: `**Current model: ${agent.stats.modelName}**\n\n${list}\n\nSwitch: /model <alias>` }]);
          } else {
            if (agent.switchModel(arg)) {
              agent.reset();
              setMessages([]);
              setMessages(prev => [...prev, { role: 'assistant', content: `Switched to **${agent.stats.modelName}**. Conversation reset.` }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: `Unknown model: ${arg}\nUse /model to see options.` }]);
            }
          }
          return;
        }
        case 'models': {
          const models = agent.getProvider().listModels();
          const list = models.map(m => `${m.active ? '> ' : '  '}${m.alias} — ${m.name} (${m.context / 1024}K ctx)`).join('\n');
          setMessages(prev => [...prev, { role: 'assistant', content: `**Models:**\n${list}\n\nSwitch: /model <alias>` }]);
          return;
        }
        case 'stats': {
          const s = agent.stats;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Model: ${s.modelName}\nMessages: ${s.messages}\nTokens: ↑${s.usage.prompt_tokens} ↓${s.usage.completion_tokens}`,
          }]);
          return;
        }
        case 'mode': {
          if (!arg) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Current mode: **${permissions.getMode()}**${permissions.isSandboxed() ? ' + sandbox' : ''}\n${permissions.getModeDescription()}\n\nSwitch with: /mode <manual|auto|yolo>\nToggle sandbox: /mode sandbox` }]);
          } else if (arg === 'sandbox') {
            const sandboxOn = permissions.toggleSandbox();
            if (sandboxOn) permissions.setJailDir(process.cwd());
            setIsSandboxed(sandboxOn);
            setConfigValue('lastSandbox', sandboxOn);
            setMessages(prev => [...prev, { role: 'assistant', content: `Sandbox ${sandboxOn ? 'enabled' : 'disabled'}\n${permissions.getModeDescription()}` }]);
          } else {
            const validModes = ['manual', 'auto', 'yolo'];
            if (validModes.includes(arg)) {
              permissions.setMode(arg as PermissionMode);
              setCurrentMode(arg as PermissionMode);
              setConfigValue('lastMode', arg as PermissionMode);
              setMessages(prev => [...prev, { role: 'assistant', content: `Mode switched to **${arg}**${permissions.isSandboxed() ? ' + sandbox' : ''}\n${permissions.getModeDescription()}` }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: `Unknown mode: ${arg}\nAvailable: manual, auto, yolo\nToggle sandbox: /mode sandbox` }]);
            }
          }
          return;
        }
        case 'companion': {
          if (!arg) {
            const current = COMPANIONS[companionId];
            const available = COMPANION_IDS.map(id => `${id === companionId ? '\u25B6 ' : '  '}${COMPANIONS[id].name} (${id})`).join('\n');
            setMessages(prev => [...prev, { role: 'assistant', content: `Current companion: **${current.name}**\n\nAvailable:\n${available}\n\nSwitch with: /companion <${COMPANION_IDS.join('|')}>` }]);
          } else if (COMPANIONS[arg]) {
            // Gate: only alien is free, rest are Pro
            if (arg !== 'alien' && !isPro()) {
              const gate = requirePro('Extra companions');
              setMessages(prev => [...prev, { role: 'assistant', content: gate! }]);
              return;
            }
            setCompanionId(arg);
            saveCompanionConfig({ companionId: arg, firstLaunchComplete: true });
            const c = COMPANIONS[arg];
            setMessages(prev => [...prev, { role: 'assistant', content: `Switched companion to **${c.name}** - ${c.description}` }]);
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: `Unknown companion: ${arg}\nAvailable: ${COMPANION_IDS.join(', ')}` }]);
          }
          return;
        }
        case 'help':
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '**Commands:**\n- /help — this message\n- /about — version info, license status, support links\n- /activate <key> — activate Pro license\n- /model — switch model (standard, fast, reason)\n- /models — list all models\n- /mode — permission mode (manual, auto, yolo)\n- /mode sandbox — toggle folder jail\n- /companion — switch companion (Pro: all 4)\n- /stats — token usage\n- /reset — clear conversation\n- /quit — exit',
          }]);
          return;
        case 'about': {
          const proStatus = isPro() ? '✅ Pro (activated)' : '🆓 Free';
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**GROK CODE v2.0.0** — ${proStatus}\nby ClawdWorks\n\nAutonomous AI coding agent powered by xAI's Grok.\n\n**Support the project:**\n☕ Buy me a coffee: https://buymeacoffee.com/clawdworks\n⭐ Star on GitHub: https://github.com/kevdogg102396-afk/grok-code\n\n${isPro() ? 'Thanks for being Pro! All features unlocked.' : '**Upgrade to Pro ($5 one-time):**\nAll companions, all personalities, sub-agents, skills.\nGet it at: https://github.com/kevdogg102396-afk/grok-code\nActivate: /activate <your-key>'}\n\nBuilt with ❤️ by Kevin Cline & Claude`,
          }]);
          return;
        }
        case 'activate': {
          if (!arg) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Usage: /activate <license-key>\n\nGet a key at: https://github.com/kevdogg102396-afk/grok-code' }]);
          } else {
            const result = activateLicense(arg);
            setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
          }
          return;
        }
        case 'settings': {
          if (!arg) {
            setMessages(prev => [...prev, { role: 'assistant', content: `**Settings:**\n\n- /settings startmode <auto|yolo|manual|last>\n  What mode to start in. "last" remembers your last mode.\n  Current: ${savedConfig.startMode || 'auto (default)'}` }]);
          } else if (arg.startsWith('startmode')) {
            const val = arg.split(' ')[1];
            if (val && ['auto', 'yolo', 'manual', 'last'].includes(val)) {
              setConfigValue('startMode', val as any);
              setMessages(prev => [...prev, { role: 'assistant', content: `Start mode set to **${val}**. ${val === 'last' ? 'Grok will remember your last mode between sessions.' : `Grok will always start in ${val} mode.`}` }]);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: 'Usage: /settings startmode <auto|yolo|manual|last>' }]);
            }
          } else {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Unknown setting. Available:\n- /settings startmode <auto|yolo|manual|last>' }]);
          }
          return;
        }
      }
      // Unknown command
      setMessages(prev => [...prev, { role: 'assistant', content: `Unknown command: ${cmd}\nType /help for available commands.` }]);
      return;
    }

    // Add user message to display
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setHistory(prev => [...prev, input]);
    setIsStreaming(true);
    setStreamText('');
    setActiveTools([]);
    setLastCompanionEvent('thinking');

    // Configure agent callbacks — BATCHED updates to prevent footer re-renders
    let currentStream = '';
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    (agent as any).onText = (chunk: string) => {
      currentStream += chunk;
      // Batch text updates — max 10 renders/sec instead of 100+
      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          setStreamText(currentStream);
          batchTimer = null;
        }, 100);
      }
    };
    (agent as any).onToolStart = () => {};
    (agent as any).onToolEnd = () => {};
    (agent as any).onUsage = () => {};  // tokens update at end only
    (agent as any).requestPermission = (toolName: string, args: Record<string, any>): Promise<boolean> => {
      const check = permissions.check(toolName, args);
      if (!check.allowed) {
        // Blocked (e.g. sandbox jail) — auto-deny
        setMessages(prev => [...prev, { role: 'assistant', content: check.reason || `Blocked: ${toolName}` }]);
        return Promise.resolve(false);
      }
      if (!check.needsConfirm) {
        // Auto-allowed
        return Promise.resolve(true);
      }
      // Show permission prompt UI
      return new Promise<boolean>((resolve) => {
        setPermissionRequest({ toolName, args, resolve });
      });
    };

    // Run agent
    const result = await agent.run(input);

    // Flush any pending batched text
    if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }

    // Finalize — batch all state updates together
    const stats = agent.stats;
    setStreamText('');
    setIsStreaming(false);
    setTokensIn(stats.usage.prompt_tokens);
    setTokensOut(stats.usage.completion_tokens);

    if (result.text) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.text }]);
    }
    if (result.error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${result.error}` }]);
    }
  }, [agent, exit, companionId]);

  // Handle Ctrl+C
  useInput((ch, key) => {
    if (key.ctrl && ch === 'c') {
      exit();
    }
  });

  // Splash first
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} model={agent.stats.modelName} />;
  }

  // Then character picker on first launch
  if (showCharacterPicker) {
    return <CharacterPicker onSelect={handleCharacterSelect} />;
  }

  const cost = calculateCost(modelAlias, { prompt_tokens: tokensIn, completion_tokens: tokensOut });

  return (
    <Box flexDirection="column" height="100%">
      {/* Chat + input above the footer */}
      <ChatView
        messages={messages}
        streamText={streamText}
        isStreaming={isStreaming}
      />
      {permissionRequest && (
        <PermissionPrompt
          toolName={permissionRequest.toolName}
          args={permissionRequest.args}
          onAllow={() => {
            permissionRequest.resolve(true);
            setPermissionRequest(null);
          }}
          onDeny={() => {
            permissionRequest.resolve(false);
            setPermissionRequest(null);
          }}
        />
      )}
      <InputBarMemo
        onSubmit={handleSubmit}
        disabled={isStreaming}
        history={history}
      />
      {/* Footer — always pinned at bottom */}
      <StatusBarMemo
        model={agent.stats.modelName}
        tokensIn={tokensIn}
        tokensOut={tokensOut}
        cost={cost}
        mode={currentMode}
        sandboxed={isSandboxed}
        companionId={companionId}
        lastEvent={lastCompanionEvent}
        quipOverride={companionQuip}
        cwd={process.cwd()}
      />
    </Box>
  );
}

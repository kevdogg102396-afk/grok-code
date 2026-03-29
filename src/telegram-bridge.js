#!/usr/bin/env node
// Grok-Code Telegram Bridge
// Routes Telegram messages through Grok models via the proxy.

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(s => s.trim());
const MEMORY_DIR = '/workspace/memory';
const HISTORY_FILE = path.join(MEMORY_DIR, 'conversation_history.json');
const MAX_HISTORY = 20;

// Model switching
const MODEL_MAP = {
  grok4fast: { cc: 'sonnet', name: 'Grok 4.1 Fast', id: 'grok-4-1-fast' },
  grok4:     { cc: 'opus',   name: 'Grok 4',        id: 'grok-4' },
  grok3mini: { cc: 'haiku',  name: 'Grok 3 Mini',   id: 'grok-3-mini' },
};
let currentModel = 'grok4fast';

if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error(`Failed to save history: ${err.message}`);
  }
}

let offset = 0;
let conversationHistory = loadHistory();

function tgApi(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ ok: false }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendTyping(chatId) {
  await tgApi('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function sendMessage(chatId, text, replyTo) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }
  for (const chunk of chunks) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'Markdown',
      ...(replyTo ? { reply_to_message_id: replyTo } : {})
    });
  }
}

function buildPrompt(newMessage) {
  let prompt = '';
  if (conversationHistory.length > 0) {
    prompt += 'Previous conversation (for context):\n\n';
    const recent = conversationHistory.slice(-MAX_HISTORY);
    for (const entry of recent) {
      prompt += `User: ${entry.user}\n`;
      prompt += `Grok: ${entry.assistant}\n\n`;
    }
    prompt += '---\n\n';
  }
  prompt += `User: ${newMessage}\n\nRespond as Grok Agent. Be casual, direct, helpful. Don't repeat your identity every message — just be natural.`;
  return prompt;
}

function startTypingLoop(chatId) {
  const interval = setInterval(() => sendTyping(chatId), 4000);
  return () => clearInterval(interval);
}

function runGrok(prompt) {
  return new Promise((resolve) => {
    try {
      const escaped = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      const result = execSync(
        `claude -p "${escaped}" --model ${MODEL_MAP[currentModel].cc} --dangerously-skip-permissions --bare --system-prompt-file /workspace/GROK.md --add-dir /workspace --mcp-config /workspace/.mcp.json --output-format text`,
        {
          encoding: 'utf-8',
          timeout: 0,
          env: { ...process.env },
          cwd: '/workspace',
          maxBuffer: 1024 * 1024
        }
      );
      resolve(result.trim());
    } catch (err) {
      const msg = err.stderr || err.message || 'Unknown error';
      resolve(`Hit a snag: ${msg.slice(0, 500)}`);
    }
  });
}

async function pollAndRespond() {
  try {
    const updates = await tgApi('getUpdates', { offset, timeout: 30 });
    if (!updates.ok || !updates.result?.length) return;

    for (const update of updates.result) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg?.text) continue;

      const chatId = String(msg.chat.id);
      if (ALLOWED_CHAT_IDS.length && !ALLOWED_CHAT_IDS.includes(chatId)) {
        console.log(`Blocked message from unauthorized chat: ${chatId}`);
        continue;
      }

      const userName = msg.from?.first_name || 'User';
      const text = msg.text.trim();
      console.log(`[${new Date().toISOString()}] ${userName}: ${text.slice(0, 100)}`);

      // Model switching commands
      const cmdLower = text.toLowerCase();
      if (cmdLower === '/grok4fast' || cmdLower === '/grok4' || cmdLower === '/grok3mini') {
        const key = cmdLower.slice(1);
        const m = MODEL_MAP[key];
        currentModel = key;
        await sendMessage(chatId, `Switched to ${m.name} ⚡\nAll messages now use ${m.id}.`);
        continue;
      }
      if (cmdLower === '/models' || cmdLower === '/model') {
        const m = MODEL_MAP[currentModel];
        let lines = `Current model: ${m.name} (${m.id})\n\nAvailable:\n`;
        for (const [k, v] of Object.entries(MODEL_MAP)) {
          const arrow = k === currentModel ? '→ ' : '  ';
          lines += `${arrow}/${k} — ${v.name}\n`;
        }
        await sendMessage(chatId, lines.trim());
        continue;
      }

      const stopTyping = startTypingLoop(chatId);
      const prompt = buildPrompt(msg.text);
      const response = await runGrok(prompt);
      stopTyping();

      console.log(`[${new Date().toISOString()}] Grok: ${response.slice(0, 100)}...`);

      conversationHistory.push({
        user: msg.text,
        assistant: response,
        timestamp: new Date().toISOString()
      });

      if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
      }
      saveHistory(conversationHistory);

      await sendMessage(chatId, response, msg.message_id);
    }
  } catch (err) {
    console.error(`Poll error: ${err.message}`);
  }
}

async function main() {
  console.log('Grok-Code Telegram Bridge started');
  console.log(`Bot token: ...${BOT_TOKEN.slice(-10)}`);
  console.log(`Allowed chats: ${ALLOWED_CHAT_IDS.join(', ')}`);
  console.log(`History: ${conversationHistory.length} messages loaded`);
  console.log(`Default model: ${MODEL_MAP[currentModel].name}`);
  console.log('Commands: /grok4fast /grok4 /grok3mini /models');
  console.log('Waiting for messages...\n');

  await tgApi('getUpdates', { offset: -1 });
  const init = await tgApi('getUpdates', { offset: -1 });
  if (init.result?.length) offset = init.result[init.result.length - 1].update_id + 1;

  while (true) {
    await pollAndRespond();
  }
}

process.on('uncaughtException', (err) => {
  console.error(`Uncaught exception: ${err.message}`);
});
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err}`);
});

main().catch(err => {
  console.error(`Main error: ${err.message}`);
  process.exit(1);
});

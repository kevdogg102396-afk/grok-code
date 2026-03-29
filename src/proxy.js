#!/usr/bin/env node
// Grok-Code Proxy — Anthropic API → xAI OpenAI API translator
// Zero dependencies. Pure Node.js.
// Receives Anthropic-format requests, translates to OpenAI format, forwards to xAI.

const http = require('http');
const https = require('https');

const PORT = parseInt(process.env.PROXY_PORT || '4000');
const XAI_BASE = 'https://api.x.ai';
const XAI_API_KEY = process.env.XAI_API_KEY || '';

// Model mapping: CC model names → xAI model IDs
// CC appends context suffixes like [1m], [200k] etc — we need to match all variants
const MODEL_MAP = {
  'claude-sonnet-4-6': process.env.GROK_MODEL || 'grok-4.20-0309-non-reasoning',
  'claude-opus-4-6': 'grok-4.20-0309-reasoning',
  'claude-haiku-4-5-20251001': 'grok-code-fast-1',
};

// Resolve model name — strips CC context suffixes like [1m], [200k]
function resolveModel(name) {
  if (MODEL_MAP[name]) return MODEL_MAP[name];
  // Strip bracket suffixes: claude-sonnet-4-6[1m] → claude-sonnet-4-6
  const base = name.replace(/\[.*\]$/, '');
  return MODEL_MAP[base] || MODEL_MAP['claude-sonnet-4-6'];
}

// Reverse map for display
const MODEL_NAMES = {
  'grok-4.20-0309-non-reasoning': 'Grok 4.20',
  'grok-4.20-0309-reasoning': 'Grok 4.20 Reason',
  'grok-code-fast-1': 'Grok Code Fast',
};

// Convert Anthropic content blocks to OpenAI message content
function anthropicToOpenAIContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);

  const parts = [];
  const toolCalls = [];

  for (const block of content) {
    if (block.type === 'text') {
      parts.push(block.text);
    } else if (block.type === 'image') {
      // Convert Anthropic image to OpenAI vision format
      parts.push({
        type: 'image_url',
        image_url: {
          url: block.source?.type === 'base64'
            ? `data:${block.source.media_type};base64,${block.source.data}`
            : block.source?.url || '',
        },
      });
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input || {}),
        },
      });
    } else if (block.type === 'tool_result') {
      // Handled separately in message conversion
    }
  }

  return { text: parts.join(''), toolCalls };
}

// Convert Anthropic messages array to OpenAI messages array
function convertMessages(anthropicMessages, systemPrompt) {
  const openaiMessages = [];

  // System message
  if (systemPrompt) {
    const sysText = typeof systemPrompt === 'string'
      ? systemPrompt
      : Array.isArray(systemPrompt)
        ? systemPrompt.map(b => b.text || '').join('\n')
        : '';
    if (sysText) openaiMessages.push({ role: 'system', content: sysText });
  }

  for (const msg of anthropicMessages) {
    if (msg.role === 'user') {
      // Check for tool_result blocks
      if (Array.isArray(msg.content)) {
        const toolResults = msg.content.filter(b => b.type === 'tool_result');
        const otherContent = msg.content.filter(b => b.type !== 'tool_result');

        // Add tool result messages
        for (const tr of toolResults) {
          let resultContent = '';
          if (typeof tr.content === 'string') {
            resultContent = tr.content;
          } else if (Array.isArray(tr.content)) {
            resultContent = tr.content.map(b => b.text || '').join('');
          }
          openaiMessages.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content: resultContent,
          });
        }

        // Add remaining user content
        if (otherContent.length > 0) {
          const { text } = anthropicToOpenAIContent(otherContent);
          if (text) openaiMessages.push({ role: 'user', content: text });
        }
      } else {
        openaiMessages.push({ role: 'user', content: anthropicToOpenAIContent(msg.content).text || msg.content });
      }
    } else if (msg.role === 'assistant') {
      const { text, toolCalls } = anthropicToOpenAIContent(msg.content);
      const assistantMsg = { role: 'assistant' };
      if (text) assistantMsg.content = text;
      if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
      openaiMessages.push(assistantMsg);
    }
  }

  return openaiMessages;
}

// Convert Anthropic tools to OpenAI tools
function convertTools(anthropicTools) {
  if (!anthropicTools || !anthropicTools.length) return undefined;
  return anthropicTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.input_schema || {},
    },
  }));
}

// Convert OpenAI response to Anthropic response format
function openaiToAnthropicResponse(openaiResp, model) {
  const choice = openaiResp.choices?.[0];
  if (!choice) {
    return {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'No response from model.' }],
      model,
      stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  const content = [];
  const msg = choice.message;

  if (msg.content) {
    content.push({ type: 'text', text: msg.content });
  }

  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      let input = {};
      try { input = JSON.parse(tc.function.arguments); } catch {}
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input,
      });
    }
  }

  if (content.length === 0) {
    content.push({ type: 'text', text: '' });
  }

  // Map finish reason
  let stopReason = 'end_turn';
  if (choice.finish_reason === 'tool_calls') stopReason = 'tool_use';
  else if (choice.finish_reason === 'length') stopReason = 'max_tokens';
  else if (choice.finish_reason === 'stop') stopReason = 'end_turn';

  return {
    id: `msg_${openaiResp.id || Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: openaiResp.usage?.prompt_tokens || 0,
      output_tokens: openaiResp.usage?.completion_tokens || 0,
    },
  };
}

// Convert OpenAI streaming chunks to Anthropic SSE events
function convertStreamChunk(chunk, state) {
  const events = [];
  const choice = chunk.choices?.[0];
  if (!choice) return events;

  const delta = choice.delta;

  // Message start (first chunk)
  if (!state.started) {
    state.started = true;
    events.push({
      type: 'message_start',
      message: {
        id: `msg_${chunk.id || Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [],
        model: state.model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: chunk.usage?.prompt_tokens || 0, output_tokens: 0 },
      },
    });
  }

  // Text content
  if (delta?.content) {
    if (!state.inTextBlock) {
      state.inTextBlock = true;
      state.blockIndex = (state.blockIndex ?? -1) + 1;
      events.push({
        type: 'content_block_start',
        index: state.blockIndex,
        content_block: { type: 'text', text: '' },
      });
    }
    events.push({
      type: 'content_block_delta',
      index: state.blockIndex,
      delta: { type: 'text_delta', text: delta.content },
    });
  }

  // Tool calls
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      const tcIdx = tc.index ?? 0;
      const stateKey = `tool_${tcIdx}`;

      if (tc.id && !state[stateKey]) {
        // Close text block if open
        if (state.inTextBlock) {
          events.push({ type: 'content_block_stop', index: state.blockIndex });
          state.inTextBlock = false;
        }

        state[stateKey] = true;
        state.blockIndex = (state.blockIndex ?? -1) + 1;
        state[`tool_${tcIdx}_id`] = tc.id;
        state[`tool_${tcIdx}_name`] = tc.function?.name || '';
        state[`tool_${tcIdx}_args`] = '';

        events.push({
          type: 'content_block_start',
          index: state.blockIndex,
          content_block: {
            type: 'tool_use',
            id: tc.id,
            name: tc.function?.name || '',
            input: {},
          },
        });
      }

      if (tc.function?.arguments) {
        state[`tool_${tcIdx}_args`] = (state[`tool_${tcIdx}_args`] || '') + tc.function.arguments;
        events.push({
          type: 'content_block_delta',
          index: state.blockIndex,
          delta: {
            type: 'input_json_delta',
            partial_json: tc.function.arguments,
          },
        });
      }
    }
  }

  // Finish
  if (choice.finish_reason) {
    // Close any open block
    if (state.inTextBlock || state.blockIndex >= 0) {
      events.push({ type: 'content_block_stop', index: state.blockIndex });
    }

    let stopReason = 'end_turn';
    if (choice.finish_reason === 'tool_calls') stopReason = 'tool_use';
    else if (choice.finish_reason === 'length') stopReason = 'max_tokens';

    events.push({
      type: 'message_delta',
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage: { output_tokens: chunk.usage?.completion_tokens || state.outputTokens || 0 },
    });
    events.push({ type: 'message_stop' });
  }

  return events;
}

// Make request to xAI
function xaiRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.x.ai',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, data: { error: chunks } }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Stream request to xAI
function xaiStreamRequest(path, body, onChunk, onEnd) {
  const data = JSON.stringify(body);
  const req = https.request({
    hostname: 'api.x.ai',
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
      'Content-Length': Buffer.byteLength(data),
    },
  }, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            onEnd();
            return;
          }
          try {
            onChunk(JSON.parse(payload));
          } catch {}
        }
      }
    });
    res.on('end', onEnd);
    res.on('error', (err) => onEnd(err));
  });
  req.on('error', (err) => onEnd(err));
  req.write(data);
  req.end();
}

// HTTP server
const server = http.createServer((req, res) => {
  // Log all requests for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Health check
  if (req.url === '/health/readiness' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }

  // Models endpoint — CC checks this to validate model names
  if (req.url === '/v1/models' && req.method === 'GET') {
    // Include base names AND [1m]/[200k] variants that CC may request
    const baseNames = Object.keys(MODEL_MAP);
    const variants = [];
    for (const name of baseNames) {
      variants.push(name);
      variants.push(name + '[1m]');
      variants.push(name + '[200k]');
    }
    const models = variants.map(name => ({
      id: name,
      object: 'model',
      created: Date.now(),
      owned_by: 'grok-code',
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: models }));
    return;
  }

  // Messages endpoint — the main translation layer
  if (req.url === '/v1/messages' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const anthropicReq = JSON.parse(body);
        const grokModel = resolveModel(anthropicReq.model);
        const isStream = anthropicReq.stream === true;

        // Build OpenAI request
        const openaiReq = {
          model: grokModel,
          messages: convertMessages(anthropicReq.messages, anthropicReq.system),
          max_tokens: anthropicReq.max_tokens || 4096,
          stream: isStream,
        };

        // Optional params
        if (anthropicReq.temperature !== undefined) openaiReq.temperature = Math.min(anthropicReq.temperature, 1.0);
        if (anthropicReq.top_p !== undefined) openaiReq.top_p = anthropicReq.top_p;
        if (anthropicReq.stop_sequences) openaiReq.stop = anthropicReq.stop_sequences;

        // Tools
        const tools = convertTools(anthropicReq.tools);
        if (tools) openaiReq.tools = tools;

        if (isStream) {
          // Streaming mode
          if (isStream) openaiReq.stream_options = { include_usage: true };
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const state = { model: anthropicReq.model, blockIndex: -1, outputTokens: 0 };

          xaiStreamRequest('/v1/chat/completions', openaiReq,
            (chunk) => {
              const events = convertStreamChunk(chunk, state);
              for (const event of events) {
                res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
              }
            },
            (err) => {
              if (err) {
                res.write(`event: error\ndata: ${JSON.stringify({ type: 'error', error: { message: err.message } })}\n\n`);
              }
              res.end();
            }
          );
        } else {
          // Non-streaming mode
          const result = await xaiRequest('/v1/chat/completions', openaiReq);
          if (result.status !== 200) {
            res.writeHead(result.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              type: 'error',
              error: {
                type: 'api_error',
                message: result.data?.error?.message || JSON.stringify(result.data),
              },
            }));
            return;
          }
          const anthropicResp = openaiToAnthropicResponse(result.data, anthropicReq.model);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(anthropicResp));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'error',
          error: { type: 'internal_error', message: err.message },
        }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Grok-Code proxy ready on port ${PORT}`);
});

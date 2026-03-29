#!/bin/bash
# Test the Grok-Code proxy

echo "Starting proxy..."
node "$(dirname "$0")/proxy.js" &
PROXY_PID=$!
sleep 2

echo "=== Health check ==="
curl -s http://127.0.0.1:4000/health/readiness
echo ""

echo "=== Models endpoint ==="
curl -s http://127.0.0.1:4000/v1/models
echo ""

echo "=== Messages endpoint (non-streaming) ==="
curl -s -X POST http://127.0.0.1:4000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: grok-code-local" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":50,"messages":[{"role":"user","content":"say hi in one word"}]}'
echo ""

echo "=== Done ==="
kill $PROXY_PID 2>/dev/null

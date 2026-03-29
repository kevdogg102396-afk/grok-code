#!/bin/bash
# Grok-Code — AI coding agent powered by xAI's Grok models
# By ClawdWorks

# Start Node.js proxy (translates API format for xAI)
start_proxy() {
  if [ -z "$XAI_API_KEY" ]; then
    echo "ERROR: XAI_API_KEY not set. Get one at https://console.x.ai"
    exit 1
  fi
  node /usr/local/bin/grok-proxy > /tmp/grok-proxy.log 2>&1 &
  PROXY_PID=$!

  # Wait for proxy to be ready
  for i in $(seq 1 30); do
    if curl -s --max-time 2 http://127.0.0.1:4000/health/readiness > /dev/null 2>&1; then
      echo "Proxy ready (PID: $PROXY_PID)"
      break
    fi
    sleep 0.5
  done

  if ! curl -s --max-time 2 http://127.0.0.1:4000/health/readiness > /dev/null 2>&1; then
    echo "ERROR: Proxy failed to start."
    exit 1
  fi

  export ANTHROPIC_BASE_URL="http://127.0.0.1:4000"
  export ANTHROPIC_API_KEY="grok-code-local"
}

# Parse args
ACTION="${1:-chat}"
shift 2>/dev/null || true

case "$ACTION" in
  chat)
    echo -ne "\033[2J\033[H"
    grok-splash
    start_proxy
    exec claude \
      --model sonnet \
      --dangerously-skip-permissions \
      --bare \
      --system-prompt-file /workspace/GROK.md \
      --add-dir /workspace \
      --mcp-config /workspace/.mcp.json \
      "$@"
    ;;

  run)
    start_proxy
    exec claude -p "$*" \
      --model sonnet \
      --dangerously-skip-permissions \
      --bare \
      --system-prompt-file /workspace/GROK.md \
      --add-dir /workspace \
      --mcp-config /workspace/.mcp.json \
      --output-format text
    ;;

  models)
    echo "Available Grok models:"
    echo ""
    echo "    1) grok-4-1-fast    — Grok 4.1 Fast (2M context, cheapest)"
    echo "    2) grok-4           — Grok 4 (256K context, full power)"
    echo "    3) grok-3-mini      — Grok 3 Mini (131K context, budget)"
    echo ""
    echo "Switch with: GROK_MODEL=<model-id> grok-code"
    ;;

  telegram)
    grok-splash
    start_proxy
    exec node /usr/local/bin/grok-telegram
    ;;

  help|--help|-h)
    echo "Grok-Code by ClawdWorks"
    echo ""
    echo "Usage: grok-code [command] [options]"
    echo ""
    echo "Commands:"
    echo "  chat       Interactive chat (default)"
    echo "  run        Headless mode — run a prompt and exit"
    echo "  telegram   Start with Telegram bridge"
    echo "  models     List available Grok models"
    echo "  help       Show this help"
    echo ""
    echo "Environment:"
    echo "  XAI_API_KEY       Your xAI API key (required)"
    echo "  GROK_MODEL        Model to use (default: grok-4-1-fast)"
    echo "  GROK_MAX_TOKENS   Max output tokens (default: 16384)"
    echo ""
    echo "Examples:"
    echo "  grok-code                              # Start chatting"
    echo "  grok-code run 'explain this code'      # One-shot prompt"
    echo "  grok-code telegram                     # Telegram bridge"
    echo "  GROK_MODEL=grok-4 grok-code            # Use Grok 4"
    ;;

  *)
    echo "Unknown command: $ACTION"
    echo "Run 'grok-code help' for usage"
    exit 1
    ;;
esac

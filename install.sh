#!/bin/bash
# Grok-Code — Universal Installer
# By ClawdWorks | One command. AI coding agent powered by Grok.
#
# curl -fsSL https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.sh | bash

set -e

# Colors
CYAN='\033[0;36m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# Splash
clear
echo ""
echo -e "${YELLOW}  ★    ✦       ★          ✦        ★       ✦      ★${RESET}"
echo -e "${YELLOW}     ✦          ★         ✦           ★             ✦${RESET}"
echo ""
echo -e "${WHITE}${BOLD}   GROK CODE${RESET}"
echo -e "${CYAN}   by ClawdWorks${RESET}"
echo ""
echo -e "${DIM}   AI coding agent powered by xAI's Grok models.${RESET}"
echo ""
echo -e "${YELLOW}  ★    ✦       ★          ✦        ★       ✦      ★${RESET}"
echo ""
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""

# ─── Step 1: xAI API Key ──────────────────────────────────────────
echo -e "${YELLOW}${BOLD}  [1/4] xAI API Key${RESET}"
echo ""

if [ -n "$XAI_API_KEY" ]; then
    echo -e "  ${GREEN}✓${RESET} Found XAI_API_KEY in your environment"
    echo -e "  ${DIM}Key: ...${XAI_API_KEY: -8}${RESET}"
    echo ""
    echo -n "  Use this key? [Y/n]: "
    read -r USE_EXISTING
    if [[ "$USE_EXISTING" =~ ^[Nn] ]]; then
        XAI_API_KEY=""
    fi
fi

if [ -z "$XAI_API_KEY" ]; then
    echo -e "  You need an xAI API key."
    echo -e "  Get one at: ${CYAN}https://console.x.ai${RESET}"
    echo ""
    echo -e "  ${DIM}Sign up, add credits, generate a key, paste it here.${RESET}"
    echo ""
    echo -n "  Paste your xAI API key: "
    read -r XAI_API_KEY
    echo ""

    if [ -z "$XAI_API_KEY" ]; then
        echo -e "  ${RED}No key provided.${RESET} Get one at https://console.x.ai"
        exit 1
    fi

    if [[ ! "$XAI_API_KEY" =~ ^xai- ]]; then
        echo -e "  ${RED}Warning:${RESET} Key doesn't start with xai- — might not be valid"
        echo -n "  Continue anyway? [y/N]: "
        read -r CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy] ]]; then
            exit 1
        fi
    fi
fi

echo -e "  ${GREEN}✓${RESET} API key set"
echo ""

# ─── Step 2: Pick a Model ────────────────────────────────────────────
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "${YELLOW}${BOLD}  [2/4] Choose Your Model${RESET}"
echo ""
echo -e "    ${CYAN}1)${RESET} Grok 4.1 Fast    ${DIM}— 2M context, cheapest ($0.20/M in)${RESET} ${GREEN}(recommended)${RESET}"
echo -e "    ${CYAN}2)${RESET} Grok 4           ${DIM}— 256K context, full power ($3/M in)${RESET}"
echo -e "    ${CYAN}3)${RESET} Grok 3 Mini      ${DIM}— 131K context, budget ($0.30/M in)${RESET}"
echo ""
echo -n "  Choose [1]: "
read -r MODEL_CHOICE

case "${MODEL_CHOICE:-1}" in
    1) GROK_MODEL="grok-4-1-fast" ;;
    2) GROK_MODEL="grok-4" ;;
    3) GROK_MODEL="grok-3-mini" ;;
    *) GROK_MODEL="grok-4-1-fast" ;;
esac

echo -e "  ${GREEN}✓${RESET} Selected: ${CYAN}${GROK_MODEL}${RESET}"
echo ""

# ─── Step 3: Install Mode ────────────────────────────────────────────
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "${YELLOW}${BOLD}  [3/4] Installation Mode${RESET}"
echo ""
echo -e "    ${CYAN}1)${RESET} ${BOLD}Docker (sandboxed)${RESET}      ${GREEN}(recommended)${RESET}"
echo -e "       ${DIM}Secure container. Can't touch your files.${RESET}"
echo ""
echo -e "    ${CYAN}2)${RESET} ${BOLD}Local (full power)${RESET}"
echo -e "       ${DIM}Full machine access. Filesystem, browser, MCP, everything.${RESET}"
echo ""

HAS_DOCKER=false
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    HAS_DOCKER=true
fi

if [ "$HAS_DOCKER" = false ]; then
    echo -e "  ${DIM}Docker not detected — option 1 requires Docker${RESET}"
    echo ""
fi

echo -n "  Choose [1]: "
read -r INSTALL_MODE
echo ""

# ─── Step 4: Install ─────────────────────────────────────────────────
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "${YELLOW}${BOLD}  [4/4] Installing...${RESET}"
echo ""

GROK_DIR="$HOME/.grok-code"
mkdir -p "$GROK_DIR"

if [ "${INSTALL_MODE:-1}" = "1" ]; then
    # ═══ DOCKER INSTALL ═══
    if [ "$HAS_DOCKER" = false ]; then
        echo -e "  ${RED}Docker required.${RESET} Install: ${CYAN}https://docs.docker.com/get-docker/${RESET}"
        exit 1
    fi

    echo -e "  ${DIM}Building Grok-Code image...${RESET}"

    SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
    if [ -f "$SCRIPT_DIR/Dockerfile" ]; then
        cd "$SCRIPT_DIR"
    else
        echo -e "  ${DIM}Downloading source...${RESET}"
        CLONE_DIR=$(mktemp -d)
        git clone --depth 1 https://github.com/kevdogg102396-afk/grok-code.git "$CLONE_DIR" 2>&1 | tail -1
        cd "$CLONE_DIR"
    fi
    docker build -t grok-code:latest . 2>&1 | grep -E "^(#|Successfully|DONE)" | tail -5
    echo -e "  ${GREEN}✓${RESET} Docker image ready"

    # Docker launcher
    cat > "$GROK_DIR/grok-code" << LAUNCHER
#!/bin/bash
exec docker run -it --rm --dns 8.8.8.8 --dns 8.8.4.4 \
    -e XAI_API_KEY="${XAI_API_KEY}" \
    -e GROK_MODEL="${GROK_MODEL}" \
    grok-code:latest \
    "\${@:-chat}"
LAUNCHER
    chmod +x "$GROK_DIR/grok-code"

else
    # ═══ LOCAL INSTALL ═══

    # Check Node.js
    NODE_CMD=$(command -v node || command -v node.exe || echo "")
    if [ -z "$NODE_CMD" ]; then
        for CANDIDATE in \
            "/c/Program Files/nodejs/node.exe" \
            "/mnt/c/Program Files/nodejs/node.exe" \
            "$HOME/AppData/Local/fnm_multishells/"*/node.exe; do
            if [ -f "$CANDIDATE" ]; then
                NODE_CMD="$CANDIDATE"
                export PATH="$(dirname "$CANDIDATE"):$PATH"
                break
            fi
        done
    fi
    if [ -z "$NODE_CMD" ]; then
        echo -e "  ${RED}Node.js not found.${RESET} Install: ${CYAN}https://nodejs.org${RESET} (v18+)"
        exit 1
    fi
    echo -e "  ${GREEN}✓${RESET} Node.js $($NODE_CMD -v)"

    # Find npm
    NPM_CMD=$(command -v npm || command -v npm.cmd || echo "")
    if [ -z "$NPM_CMD" ] && [ -n "$NODE_CMD" ]; then
        NPM_CANDIDATE="$(dirname "$NODE_CMD")/npm"
        [ -f "$NPM_CANDIDATE" ] && NPM_CMD="$NPM_CANDIDATE"
        [ -f "${NPM_CANDIDATE}.cmd" ] && NPM_CMD="${NPM_CANDIDATE}.cmd"
    fi

    echo -e "  ${DIM}Installing Claude Code CLI...${RESET}"
    ${NPM_CMD:-npm} install -g @anthropic-ai/claude-code 2>&1 | tail -1
    echo -e "  ${GREEN}✓${RESET} CLI framework"

    mkdir -p "$GROK_DIR/workspace/memory"

    # Copy proxy
    SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
    if [ -f "$SCRIPT_DIR/src/proxy.js" ]; then
        cp "$SCRIPT_DIR/src/proxy.js" "$GROK_DIR/proxy.js"
    else
        echo -e "  ${DIM}Downloading proxy...${RESET}"
        curl -fsSL "https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/src/proxy.js" -o "$GROK_DIR/proxy.js"
    fi
    echo -e "  ${GREEN}✓${RESET} Proxy"

    # Identity
    cat > "$GROK_DIR/GROK.md" << 'IDENTITY'
# Grok Agent

You are **Grok Agent** — an AI coding agent powered by xAI's Grok models.
You run inside Grok-Code (by ClawdWorks).

## Your Models
- **Grok 4.1 Fast** — default, blazing fast, 2M context window
- **Grok 4** — full power, complex reasoning, 256K context
- **Grok 3 Mini** — lightweight and cheap, 131K context

## Rules
- Be direct, casual, no corporate tone
- If you don't know something, say so — never make stuff up
- You are Grok Agent. Own it.
IDENTITY

    # Local launcher
    cat > "$GROK_DIR/grok-code" << 'LOCALLAUNCHER'
#!/bin/bash
GROK_DIR="$HOME/.grok-code"

if [ -z "$XAI_API_KEY" ]; then
    if [ -f "$GROK_DIR/.env" ]; then
        source "$GROK_DIR/.env"
    else
        echo "XAI_API_KEY not set. Run: export XAI_API_KEY='your-key'"
        exit 1
    fi
fi

GROK_MODEL="${GROK_MODEL:-grok-4-1-fast}"
GROK_MAX_TOKENS="${GROK_MAX_TOKENS:-16384}"

# Kill any existing proxy on our port
lsof -ti:4000 2>/dev/null | xargs kill 2>/dev/null
sleep 1

# Start Node.js proxy
node "$GROK_DIR/proxy.js" &
PROXY_PID=$!
trap "kill $PROXY_PID 2>/dev/null" EXIT

# Wait for proxy
for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:4000/health/readiness > /dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

if ! curl -s http://127.0.0.1:4000/health/readiness > /dev/null 2>&1; then
    echo "Proxy failed to start."
    exit 1
fi

export ANTHROPIC_BASE_URL="http://127.0.0.1:4000"
export ANTHROPIC_API_KEY="grok-code-local"
export CLAUDE_CONFIG_DIR="$GROK_DIR/.grok-config"
mkdir -p "$CLAUDE_CONFIG_DIR"

cat > "$CLAUDE_CONFIG_DIR/.claude.json" << 'CJSON'
{"theme":"dark","customApiKeyResponses":{"approved":true}}
CJSON

echo ""
echo -e "\033[1;33m  ★    ✦       ★          ✦        ★       ✦      ★\033[0m"
echo ""
echo -e "\033[1;37m   GROK CODE\033[0m"
echo -e "\033[0;36m   by ClawdWorks\033[0m"
echo ""
echo -e "\033[0;37m   $GROK_MODEL\033[0m"
echo -e "\033[0;90m   /grok4fast /grok4 /grok3mini to switch\033[0m"
echo ""
echo -e "\033[1;33m  ★    ✦       ★          ✦        ★       ✦      ★\033[0m"
echo ""

CLAUDE_CMD="claude"
if command -v winpty &> /dev/null && [ -n "$MSYSTEM" ]; then
    CLAUDE_CMD="winpty claude"
fi

$CLAUDE_CMD --model sonnet --system-prompt-file "$GROK_DIR/GROK.md" "$@"
LOCALLAUNCHER
    chmod +x "$GROK_DIR/grok-code"

    # Save env
    echo "export XAI_API_KEY=\"${XAI_API_KEY}\"" > "$GROK_DIR/.env"
    echo "export GROK_MODEL=\"${GROK_MODEL}\"" >> "$GROK_DIR/.env"

    # Copy PowerShell launcher
    if [ -f "$SCRIPT_DIR/src/grok-code.ps1" ]; then
        cp "$SCRIPT_DIR/src/grok-code.ps1" "$GROK_DIR/grok-code.ps1"
    else
        curl -fsSL "https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/src/grok-code.ps1" -o "$GROK_DIR/grok-code.ps1" 2>/dev/null
    fi
fi

# ─── Add to PATH ─────────────────────────────────────────────────

LINK_DIR="$HOME/.local/bin"
mkdir -p "$LINK_DIR"
ln -sf "$GROK_DIR/grok-code" "$LINK_DIR/grok-code"

if ! grep -q "/.local/bin" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

# Windows support
if [ -n "$MSYSTEM" ] || [ -d "/c/Users" ] || [ -d "/mnt/c/Users" ]; then
    if [ -n "$USERPROFILE" ]; then
        WIN_BIN="$HOME/.local/bin"
        WIN_PATH_DIR="${USERPROFILE}\\.local\\bin"
        IS_WSL=false
    elif [ -d "/mnt/c/Users" ]; then
        WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
        WIN_BIN="/mnt/c/Users/${WIN_USER}/.local/bin"
        WIN_PATH_DIR="C:\\Users\\${WIN_USER}\\.local\\bin"
        IS_WSL=true
    fi

    if [ -n "$WIN_BIN" ]; then
        mkdir -p "$WIN_BIN"

        if [ "$IS_WSL" = true ]; then
            cat > "${WIN_BIN}/grok-code.cmd" << 'WSLCMD'
@echo off
wsl -e bash -lc "grok-code %*"
WSLCMD
        else
            cat > "${WIN_BIN}/grok-code.cmd" << 'WINCMD'
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.grok-code\grok-code.ps1" %*
WINCMD
        fi

        echo -e "  ${DIM}Adding to Windows PATH...${RESET}"
        powershell.exe -Command "if (-not ([Environment]::GetEnvironmentVariable('PATH','User') -like '*\.local\bin*')) { [Environment]::SetEnvironmentVariable('PATH', [Environment]::GetEnvironmentVariable('PATH','User') + ';${WIN_PATH_DIR}', 'User') }" 2>/dev/null
        echo -e "  ${GREEN}✓${RESET} Added to PATH"
    fi
fi

# ─── Done ─────────────────────────────────────────────────────────
echo ""
echo -e "${DIM}  ────────────────────────────────────────────────────────${RESET}"
echo ""
echo -e "  ${GREEN}${BOLD}Grok-Code installed successfully!${RESET}"
echo ""
echo -e "  ${WHITE}Start chatting:${RESET}  ${CYAN}grok-code${RESET}"
echo -e "  ${WHITE}Get help:${RESET}        ${CYAN}grok-code help${RESET}"
echo ""
echo -e "  ${WHITE}Model:${RESET}  ${CYAN}${GROK_MODEL}${RESET}"
echo -e "  ${WHITE}Mode:${RESET}   ${CYAN}$([ "${INSTALL_MODE:-1}" = "1" ] && echo "Docker (sandboxed)" || echo "Local (full power)")${RESET}"
echo ""
echo -e "${WHITE}${BOLD}  GROK CODE${RESET} — ${CYAN}by ClawdWorks${RESET}"
echo -e "${DIM}  AI coding agent powered by xAI's Grok models.${RESET}"
echo ""
echo -e "  ${WHITE}${BOLD}Open a new terminal, then type: ${CYAN}grok-code${RESET}"
echo ""

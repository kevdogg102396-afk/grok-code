#!/bin/bash
# Grok-Code Installer — Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/master/install.sh | bash

set -e

CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

echo ""
echo -e "${MAGENTA}${BOLD}  GROK CODE${RESET} ${DIM}v2.0.0${RESET}"
echo -e "${DIM}  by ClawdWorks${RESET}"
echo ""

# Check for Bun
if ! command -v bun &> /dev/null; then
  echo -e "${YELLOW}Bun not found. Installing Bun...${RESET}"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  echo -e "${GREEN}✓ Bun installed${RESET}"
else
  echo -e "${GREEN}✓ Bun found: $(bun --version)${RESET}"
fi

# Install directory
INSTALL_DIR="$HOME/.grok-code"
BIN_DIR="$INSTALL_DIR/bin"
APP_DIR="$INSTALL_DIR/app"

echo -e "${CYAN}Installing to $INSTALL_DIR...${RESET}"

# Create directories
mkdir -p "$BIN_DIR" "$APP_DIR" "$INSTALL_DIR/skills" "$INSTALL_DIR/data"

# Download or clone
if command -v git &> /dev/null; then
  echo -e "${DIM}Cloning from GitHub...${RESET}"
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR" && git pull --quiet
  else
    git clone --quiet https://github.com/kevdogg102396-afk/grok-code.git "$APP_DIR"
  fi
else
  echo -e "${RED}Git not found. Please install git first.${RESET}"
  exit 1
fi

# Install dependencies
echo -e "${DIM}Installing dependencies...${RESET}"
cd "$APP_DIR" && bun install --silent

# Create launcher script
cat > "$BIN_DIR/grok" << 'LAUNCHER'
#!/bin/bash
# Grok-Code launcher
GROK_DIR="$HOME/.grok-code/app"

if [ -z "$XAI_API_KEY" ]; then
  echo "Error: XAI_API_KEY not set."
  echo "Get your key at: https://console.x.ai/"
  echo ""
  echo "Set it with:"
  echo "  export XAI_API_KEY='your-key-here'"
  echo ""
  echo "Add to your ~/.bashrc or ~/.zshrc to make it permanent."
  exit 1
fi

exec bun run "$GROK_DIR/bin/grok-code.ts" "$@"
LAUNCHER
chmod +x "$BIN_DIR/grok"

# Add to PATH
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
  SHELL_RC="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
  SHELL_RC="$HOME/.bash_profile"
fi

if [ -n "$SHELL_RC" ]; then
  if ! grep -q '.grok-code/bin' "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# Grok-Code' >> "$SHELL_RC"
    echo 'export PATH="$HOME/.grok-code/bin:$PATH"' >> "$SHELL_RC"
    echo -e "${GREEN}✓ Added to PATH in $SHELL_RC${RESET}"
  fi
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Grok-Code installed!${RESET}"
echo ""
echo -e "  ${BOLD}Set your xAI API key:${RESET}"
echo -e "    ${CYAN}export XAI_API_KEY='your-key-here'${RESET}"
echo ""
echo -e "  ${BOLD}Then run:${RESET}"
echo -e "    ${CYAN}grok${RESET}"
echo ""
echo -e "  ${BOLD}Options:${RESET}"
echo -e "    ${DIM}grok --yolo           # No permission prompts${RESET}"
echo -e "    ${DIM}grok --sandbox        # Lock to current folder${RESET}"
echo -e "    ${DIM}grok --model fast     # Use cheapest model${RESET}"
echo ""
echo -e "${DIM}  Restart your terminal or run: source $SHELL_RC${RESET}"
echo ""

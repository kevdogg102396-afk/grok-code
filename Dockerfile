FROM node:22-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create sandboxed workspace
RUN useradd -m -s /bin/bash grok
RUN mkdir -p /workspace/memory && chown -R grok:grok /workspace

# Copy Grok-Code files
COPY src/grok-code.sh /usr/local/bin/grok-code
COPY src/proxy.js /usr/local/bin/grok-proxy
COPY src/splash.sh /usr/local/bin/grok-splash
COPY src/telegram-bridge.js /usr/local/bin/grok-telegram
RUN chmod +x /usr/local/bin/grok-code /usr/local/bin/grok-splash

# Copy identity and MCP config
COPY src/GROK.md /workspace/GROK.md
COPY src/mcp.json /workspace/.mcp.json
RUN chown grok:grok /workspace/GROK.md /workspace/.mcp.json

# Pre-configure to skip first-run wizard
RUN mkdir -p /home/grok/.claude && chown -R grok:grok /home/grok/.claude

USER grok

RUN echo '{"hasCompletedOnboarding":true,"lastOnboardingVersion":"2.1.83","theme":"dark","numStartups":1,"bypassPermissionsModeAccepted":true,"customApiKeyResponses":{"approved":["grok-code-local"],"rejected":[]},"projects":{"/workspace":{"hasTrustDialogAccepted":true,"allowedTools":[],"mcpContextUris":[],"enabledMcpjsonServers":[],"disabledMcpjsonServers":[],"hasCompletedProjectOnboarding":true}}}' > /home/grok/.claude.json && \
    mkdir -p /home/grok/.claude && \
    echo '{"skipDangerousModePermissionPrompt":true}' > /home/grok/.claude/settings.json

WORKDIR /workspace

# Default env vars
ENV XAI_API_KEY=""
ENV GROK_MODEL="grok-4-1-fast"
ENV GROK_MAX_TOKENS="16384"
ENV GROK_MODE="Sandboxed Docker"

ENTRYPOINT ["grok-code"]

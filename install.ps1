# Grok-Code — Windows PowerShell Installer
# By ClawdWorks | One command. AI coding agent powered by Grok.
#
# irm https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/install.ps1 | iex

$ErrorActionPreference = "Continue"

Clear-Host
Write-Host ""
Write-Host "  *    +       *          +        *       +      *" -ForegroundColor Yellow
Write-Host "     +          *         +           *             +" -ForegroundColor Yellow
Write-Host ""
Write-Host "   GROK CODE" -ForegroundColor White
Write-Host "   by ClawdWorks" -ForegroundColor Cyan
Write-Host ""
Write-Host "   AI coding agent powered by xAI's Grok models." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  *    +       *          +        *       +      *" -ForegroundColor Yellow
Write-Host ""
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# ---- Step 1: xAI API Key ----
Write-Host "  [1/3] xAI API Key" -ForegroundColor Yellow
Write-Host ""

$XaiKey = $env:XAI_API_KEY
if ($XaiKey) {
    Write-Host "  " -NoNewline; Write-Host "ok" -ForegroundColor Green -NoNewline; Write-Host " Found XAI_API_KEY in your environment"
    Write-Host "  Key: ...$($XaiKey.Substring($XaiKey.Length - 8))" -ForegroundColor DarkGray
    Write-Host ""
    $use = Read-Host "  Use this key? [Y/n]"
    if ($use -match '^[Nn]') { $XaiKey = "" }
}

if (-not $XaiKey) {
    Write-Host "  You need an xAI API key."
    Write-Host "  Get one at: " -NoNewline; Write-Host "https://console.x.ai" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Sign up, add credits, generate a key, paste it here." -ForegroundColor DarkGray
    Write-Host ""
    $XaiKey = Read-Host "  Paste your xAI API key"
    if (-not $XaiKey) {
        Write-Host "  No key provided. Get one at https://console.x.ai" -ForegroundColor Red
        exit 1
    }
    if ($XaiKey -notmatch '^xai-') {
        Write-Host "  Warning: Key doesn't start with xai- - might not be valid" -ForegroundColor Red
        $cont = Read-Host "  Continue anyway? [y/N]"
        if ($cont -notmatch '^[Yy]') { exit 1 }
    }
}
Write-Host "  ok API key set" -ForegroundColor Green
Write-Host ""

# ---- Step 2: Model ----
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  [2/3] Choose Your Model" -ForegroundColor Yellow
Write-Host ""
Write-Host "    1) Grok 4.1 Fast    - 2M context, cheapest " -NoNewline; Write-Host "(recommended)" -ForegroundColor Green
Write-Host "    2) Grok 4           - 256K context, full power"
Write-Host "    3) Grok 3 Mini      - 131K context, budget"
Write-Host ""
$modelChoice = Read-Host "  Choose [1]"
if (-not $modelChoice) { $modelChoice = "1" }

$GrokModel = switch ($modelChoice) {
    "1" { "grok-4-1-fast" }
    "2" { "grok-4" }
    "3" { "grok-3-mini" }
    default { "grok-4-1-fast" }
}
Write-Host "  ok Selected: $GrokModel" -ForegroundColor Green
Write-Host ""

# ---- Step 3: Install ----
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  [3/3] Installing..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    $candidates = @("C:\Program Files\nodejs\node.exe")
    foreach ($p in $candidates) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $env:PATH = "$($found.DirectoryName);$env:PATH"
            $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
            break
        }
    }
}
if (-not $nodeCmd) {
    Write-Host "  Node.js not found. Install: https://nodejs.org (v18+)" -ForegroundColor Red
    exit 1
}
Write-Host "  ok Node.js $(node -v)" -ForegroundColor Green

# Install CLI framework
Write-Host "  Installing CLI framework..." -ForegroundColor DarkGray
npm install -g @anthropic-ai/claude-code 2>&1 | Select-Object -Last 1
Write-Host "  ok CLI framework" -ForegroundColor Green

# Configure
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$GrokDir = "$env:USERPROFILE\.grok-code"

New-Item -ItemType Directory -Path $GrokDir -Force | Out-Null
New-Item -ItemType Directory -Path "$GrokDir\.grok-config" -Force | Out-Null

# Save env
$envContent = "export XAI_API_KEY=`"$XaiKey`"`nexport GROK_MODEL=`"$GrokModel`""
[IO.File]::WriteAllText("$GrokDir\.env", $envContent, $Utf8NoBom)

# Pre-bake onboarding
$claudeJson = '{"theme":"dark","customApiKeyResponses":{"approved":true}}'
[IO.File]::WriteAllText("$GrokDir\.grok-config\.claude.json", $claudeJson, $Utf8NoBom)

# Copy proxy
$scriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { $null }
if ($scriptDir -and (Test-Path "$scriptDir\src\proxy.js")) {
    Copy-Item "$scriptDir\src\proxy.js" "$GrokDir\proxy.js" -Force
} else {
    curl.exe -fsSL "https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/src/proxy.js" -o "$GrokDir\proxy.js" 2>$null
}
Write-Host "  ok Proxy" -ForegroundColor Green

# Copy PS1 launcher
if ($scriptDir -and (Test-Path "$scriptDir\src\grok-code.ps1")) {
    Copy-Item "$scriptDir\src\grok-code.ps1" "$GrokDir\grok-code.ps1" -Force
} else {
    curl.exe -fsSL "https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/main/src/grok-code.ps1" -o "$GrokDir\grok-code.ps1" 2>$null
}
Write-Host "  ok Launcher" -ForegroundColor Green

# Create .cmd wrapper
$binDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

$cmdContent = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%USERPROFILE%\.grok-code\grok-code.ps1`" %*"
[IO.File]::WriteAllText("$binDir\grok-code.cmd", $cmdContent, $Utf8NoBom)
Write-Host "  ok grok-code.cmd" -ForegroundColor Green

# Add to PATH if needed
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*\.local\bin*") {
    [Environment]::SetEnvironmentVariable("PATH", "$binDir;$userPath", "User")
    Write-Host "  ok Added to PATH" -ForegroundColor Green
    Write-Host "  (Open a new terminal for PATH to take effect)" -ForegroundColor DarkGray
}

# ---- Done ----
Write-Host ""
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Grok-Code installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Start chatting:  " -NoNewline; Write-Host "grok-code" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Model:  $GrokModel" -ForegroundColor Cyan
Write-Host ""
Write-Host "  GROK CODE" -ForegroundColor White -NoNewline; Write-Host " - " -NoNewline; Write-Host "by ClawdWorks" -ForegroundColor Cyan
Write-Host "  AI coding agent powered by xAI's Grok models." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Open a new terminal, then type: " -NoNewline; Write-Host "grok-code" -ForegroundColor Cyan
Write-Host ""

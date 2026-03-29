# Grok-Code — PowerShell Launcher
# By ClawdWorks | AI coding agent powered by xAI's Grok models

$GrokDir = "$env:USERPROFILE\.grok-code"
$EnvFile = "$GrokDir\.env"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Model registry
$Models = @(
    @{ id = "grok-4.20-0309-non-reasoning"; name = "Grok 4.20";         desc = "newest flagship, fast" }
    @{ id = "grok-4.20-0309-reasoning";     name = "Grok 4.20 Reason";  desc = "deep reasoning mode" }
    @{ id = "grok-code-fast-1";             name = "Grok Code Fast";    desc = "dedicated coding model" }
)

# Load .env
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*export\s+(\w+)="?([^"]*)"?\s*$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
        }
    }
}

# Handle subcommands
$firstArg = if ($args.Count -gt 0) { $args[0] } else { "" }

if ($firstArg -eq "models") {
    Write-Host ""
    Write-Host "  Available Grok models:" -ForegroundColor White
    Write-Host ""
    $currentModel = if ($env:GROK_MODEL) { $env:GROK_MODEL } else { "grok-4.20-0309-non-reasoning" }
    for ($i = 0; $i -lt $Models.Count; $i++) {
        $m = $Models[$i]
        $num = $i + 1
        if ($m.id -eq $currentModel) {
            Write-Host "  * $num) $($m.name)" -ForegroundColor Green -NoNewline
            Write-Host "  (active)" -ForegroundColor Green
        } else {
            Write-Host "    $num) $($m.name)" -NoNewline
            Write-Host "  - $($m.desc)" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    $pick = Read-Host "  Switch to [enter to keep current]"
    if ($pick -and $pick -match '^\d+$') {
        $idx = [int]$pick - 1
        if ($idx -ge 0 -and $idx -lt $Models.Count) {
            $newModel = $Models[$idx].id
            $envContent = "export XAI_API_KEY=`"$env:XAI_API_KEY`"`nexport GROK_MODEL=`"$newModel`""
            [IO.File]::WriteAllText($EnvFile, $envContent, $Utf8NoBom)
            Write-Host "  Switched to: $($Models[$idx].name)" -ForegroundColor Green
            Write-Host "  Run 'grok-code' to start with the new model." -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    exit 0
}

if ($firstArg -eq "help" -or $firstArg -eq "--help" -or $firstArg -eq "-h") {
    Write-Host ""
    Write-Host "  Grok-Code by ClawdWorks" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Usage: grok-code [command]"
    Write-Host ""
    Write-Host "    (no args)    Interactive chat (default)"
    Write-Host "    models       List and switch Grok models"
    Write-Host "    help         Show this help"
    Write-Host ""
    Write-Host "  Environment:"
    Write-Host "    XAI_API_KEY       Your xAI API key (required)"
    Write-Host "    GROK_MODEL        Model to use (saved in ~/.grok-code/.env)"
    Write-Host ""
    exit 0
}

# ---- Main launcher (chat mode) ----

if (-not $env:XAI_API_KEY) {
    Write-Host "XAI_API_KEY not set. Get one at https://console.x.ai" -ForegroundColor Red
    exit 1
}

$GrokModel = if ($env:GROK_MODEL) { $env:GROK_MODEL } else { "grok-4.20-0309-non-reasoning" }
$MaxTokens = if ($env:GROK_MAX_TOKENS) { $env:GROK_MAX_TOKENS } else { "16384" }

# Friendly model name
$FriendlyModel = ($Models | Where-Object { $_.id -eq $GrokModel } | Select-Object -First 1).name
if (-not $FriendlyModel) { $FriendlyModel = $GrokModel }

# Find proxy.js
$proxyScript = "$GrokDir\proxy.js"
if (-not (Test-Path $proxyScript)) {
    Write-Host "Proxy not found at $proxyScript" -ForegroundColor Red
    exit 1
}

# Check if proxy is already running
$proxyUp = $false
try {
    $null = curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:4000/health/readiness" 2>$null
    if ($LASTEXITCODE -eq 0) { $proxyUp = $true }
} catch {}

$proxyProcess = $null
if (-not $proxyUp) {
    # Start Node.js proxy in background
    $proxyProcess = Start-Process -FilePath "node" -ArgumentList "`"$proxyScript`"" -WindowStyle Hidden -PassThru

    Write-Host "  Starting proxy..." -ForegroundColor DarkGray
    for ($i = 0; $i -lt 15; $i++) {
        try {
            $null = curl.exe -s -o NUL "http://127.0.0.1:4000/health/readiness" 2>$null
            if ($LASTEXITCODE -eq 0) { $proxyUp = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 500
    }

    if (-not $proxyUp) {
        Write-Host "Proxy failed to start." -ForegroundColor Red
        exit 1
    }
}

# Set env for CC CLI
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:4000"
$env:ANTHROPIC_API_KEY = "grok-code-local"
$env:CLAUDE_CONFIG_DIR = "$GrokDir\.grok-config"

# Pre-bake onboarding (must match Docker config exactly to skip ALL prompts)
$configDir = "$GrokDir\.grok-config"
if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }
$claudeJson = '{"hasCompletedOnboarding":true,"lastOnboardingVersion":"2.1.83","theme":"dark","numStartups":5,"bypassPermissionsModeAccepted":true,"customApiKeyResponses":{"approved":["grok-code-local"],"rejected":[]}}'
[IO.File]::WriteAllText("$configDir\.claude.json", $claudeJson, $Utf8NoBom)

# Settings to skip dangerous mode prompt
$settingsJson = '{"skipDangerousModePermissionPrompt":true}'
[IO.File]::WriteAllText("$configDir\settings.json", $settingsJson, $Utf8NoBom)

# Write identity
$identity = @'
# Grok Agent

You are **Grok Agent** — an AI coding agent powered by xAI's Grok models.
You run inside Grok-Code (by ClawdWorks).

## Your Models
- **Grok 4.20** — newest flagship, default
- **Grok 4.20 Reason** — deep reasoning for complex problems
- **Grok Code Fast** — dedicated coding model, fastest

## Rules
- Be direct, casual, no corporate tone
- If you don't know something, say so — never make stuff up
- You are Grok Agent. Own it.
'@
[IO.File]::WriteAllText("$GrokDir\GROK.md", $identity, $Utf8NoBom)

# Branding
Clear-Host
Write-Host ""
Write-Host "     .    *       .          *        .       *      ." -ForegroundColor Yellow
Write-Host "  *          .         *           .             *    " -ForegroundColor Yellow
Write-Host ""
Write-Host "    _____ _____   ____  _  __" -ForegroundColor White
Write-Host "   / ____|  __ \ / __ \| |/ /" -ForegroundColor White
Write-Host "  | |  __| |__) | |  | | ' / " -ForegroundColor White
Write-Host "  | | |_ |  _  /| |  | |  <  " -ForegroundColor White
Write-Host "  | |__| | | \ \| |__| | . \ " -ForegroundColor White
Write-Host "   \_____|_|  \_\\____/|_|\_\" -ForegroundColor White
Write-Host ""
Write-Host "    _____ ____  _____  ______ " -ForegroundColor White
Write-Host "   / ____/ __ \|  __ \|  ____|" -ForegroundColor White
Write-Host "  | |   | |  | | |  | | |__   " -ForegroundColor White
Write-Host "  | |   | |  | | |  | |  __|  " -ForegroundColor White
Write-Host "  | |___| |__| | |__| | |____ " -ForegroundColor White
Write-Host "   \_____\____/|_____/|______|" -ForegroundColor White
Write-Host ""
Write-Host "            by  C l a w d W o r k s" -ForegroundColor Cyan
Write-Host ""
Write-Host "     .    *       .          *        .       *      ." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Model: " -ForegroundColor White -NoNewline
Write-Host "$FriendlyModel" -ForegroundColor Cyan
Write-Host "   Switch: " -ForegroundColor White -NoNewline
Write-Host "Grok 4.20  |  Grok 4.20 Reason  |  Grok Code Fast" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Launch — --bare skips CC's own splash/model validation so only OUR branding shows
$winpty = "C:\Program Files\Git\usr\bin\winpty.exe"

if ((Test-Path $winpty) -and -not ($args -contains "--print")) {
    & $winpty claude --model sonnet --dangerously-skip-permissions --bare --system-prompt-file "$GrokDir\GROK.md" @args
} else {
    & claude --model sonnet --dangerously-skip-permissions --bare --system-prompt-file "$GrokDir\GROK.md" @args
}

# Kill proxy on exit if we started it
if ($proxyProcess -and -not $proxyProcess.HasExited) {
    Stop-Process -Id $proxyProcess.Id -Force -ErrorAction SilentlyContinue
}

# Grok-Code Installer — Windows
# Usage: irm https://raw.githubusercontent.com/kevdogg102396-afk/grok-code/master/install/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  GROK CODE " -ForegroundColor Magenta -NoNewline
Write-Host "v2.0.0" -ForegroundColor DarkGray
Write-Host "  by ClawdWorks" -ForegroundColor DarkGray
Write-Host ""

# Check for Bun
$bunPath = Get-Command bun -ErrorAction SilentlyContinue
if (-not $bunPath) {
    Write-Host "Bun not found. Installing Bun..." -ForegroundColor Yellow
    irm https://bun.sh/install.ps1 | iex
    # Refresh PATH
    $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
    Write-Host "✓ Bun installed" -ForegroundColor Green
} else {
    $bunVersion = & bun --version
    Write-Host "✓ Bun found: $bunVersion" -ForegroundColor Green
}

# Install directory
$InstallDir = "$env:USERPROFILE\.grok-code"
$AppDir = "$InstallDir\app"
$BinDir = "$InstallDir\bin"

Write-Host "Installing to $InstallDir..." -ForegroundColor Cyan

# Create directories
New-Item -ItemType Directory -Force -Path $BinDir, "$InstallDir\skills", "$InstallDir\data" | Out-Null

# Clone or update
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "Git not found. Please install git first." -ForegroundColor Red
    Write-Host "  https://git-scm.com/download/win" -ForegroundColor DarkGray
    exit 1
}

if (Test-Path "$AppDir\.git") {
    Write-Host "Updating..." -ForegroundColor DarkGray
    Push-Location $AppDir
    & git pull --quiet
    Pop-Location
} else {
    Write-Host "Cloning from GitHub..." -ForegroundColor DarkGray
    & git clone --quiet https://github.com/kevdogg102396-afk/grok-code.git $AppDir
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor DarkGray
Push-Location $AppDir
& bun install --silent
Pop-Location

# Create PowerShell function in profile
$ProfileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $ProfileDir)) {
    New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
}

# Check if function already exists
$profileContent = ""
if (Test-Path $PROFILE) {
    $profileContent = Get-Content $PROFILE -Raw
}

if ($profileContent -notmatch "function grok") {
    $grokFunction = @'

# Grok-Code
function grok {
    if (-not $env:XAI_API_KEY) {
        Write-Host "Error: XAI_API_KEY not set." -ForegroundColor Red
        Write-Host "Get your key at: https://console.x.ai/" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "Set it with:" -ForegroundColor White
        Write-Host '  $env:XAI_API_KEY = "your-key-here"' -ForegroundColor Cyan
        return
    }
    bun run "$env:USERPROFILE\.grok-code\app\bin\grok-code.ts" @args
}
'@
    Add-Content -Path $PROFILE -Value $grokFunction
    Write-Host "✓ Added 'grok' command to PowerShell profile" -ForegroundColor Green
} else {
    Write-Host "✓ 'grok' command already in profile" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ Grok-Code installed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Set your xAI API key:" -ForegroundColor White
Write-Host '    $env:XAI_API_KEY = "your-key-here"' -ForegroundColor Cyan
Write-Host ""
Write-Host "  Then run:" -ForegroundColor White
Write-Host "    grok" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Options:" -ForegroundColor White
Write-Host "    grok --yolo           # No permission prompts" -ForegroundColor DarkGray
Write-Host "    grok --sandbox        # Lock to current folder" -ForegroundColor DarkGray
Write-Host "    grok --model fast     # Use cheapest model" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Restart your terminal to use the 'grok' command." -ForegroundColor DarkGray
Write-Host ""

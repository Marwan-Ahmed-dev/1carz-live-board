# 1CARZ Live Board — One-Click Deploy Script
#
# This script walks you through deploying to Vercel.
# Run from PowerShell:
#
#   cd "C:\Users\Mrwan\.minimax\sessions\mvs_4b8b2e42a6664442a08cc9b2b2882873\workspace\1carz-pwa"
#   .\deploy-now.ps1
#
# What it does:
#   1. Verifies vercel CLI is available (installs via npx if missing)
#   2. Logs you in to Vercel (opens browser once)
#   3. Runs `vercel --prod` to deploy

$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
Set-Location $projectDir

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 1CARZ Live Board - Vercel Deploy" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Pre-flight checks
Write-Host "[1/4] Checking environment..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "      Node: $nodeVersion"

if (-not (Test-Path "vercel.json")) {
  Write-Host "[ERROR] vercel.json not found in $projectDir" -ForegroundColor Red
  exit 1
}
Write-Host "      vercel.json: OK" -ForegroundColor Green

if (-not (Test-Path ".git")) {
  Write-Host "      Initializing git..." -ForegroundColor Yellow
  git init | Out-Null
  git config user.email "deploy@1carz.com"
  git config user.name "1CARZ Deploy"
  git add . | Out-Null
  git commit -m "Initial 1CARZ Live Board deploy" | Out-Null
  Write-Host "      Git: OK" -ForegroundColor Green
} else {
  Write-Host "      Git: OK (already initialized)" -ForegroundColor Green
}

# Install vercel CLI if missing
Write-Host "`n[2/4] Vercel CLI..." -ForegroundColor Yellow
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
  Write-Host "      Will use npx vercel (no install needed)"
} else {
  Write-Host "      vercel: $($vercelCmd.Source) - $((vercel --version).Trim())" -ForegroundColor Green
}

# Login
Write-Host "`n[3/4] Login to Vercel..." -ForegroundColor Yellow
Write-Host "      A browser window will open. Sign in and click Authorize." -ForegroundColor Cyan
Write-Host "      Press any key when ready to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Use --github for GitHub OAuth login (--git is not recognized in newer CLI versions)
npx vercel login --github
if ($LASTEXITCODE -ne 0) {
  # Fallback to interactive login (asks for email)
  Write-Host "      Trying interactive login..." -ForegroundColor Yellow
  npx vercel login
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Login failed or cancelled" -ForegroundColor Red
    exit 1
  }
}
Write-Host "      Login: OK" -ForegroundColor Green

# Deploy
Write-Host "`n[4/4] Deploying to production..." -ForegroundColor Yellow
Write-Host "      This will take 60-90 seconds..." -ForegroundColor Cyan
Write-Host ""

npx vercel --prod --yes
$deployExit = $LASTEXITCODE

if ($deployExit -ne 0) {
  Write-Host "`n[WARN] Production deploy failed or cancelled" -ForegroundColor Yellow
  Write-Host "      Trying preview deploy instead..." -ForegroundColor Cyan
  npx vercel --yes
  $deployExit = $LASTEXITCODE
}

if ($deployExit -eq 0) {
  Write-Host "`n========================================" -ForegroundColor Green
  Write-Host " DEPLOY SUCCESSFUL!" -ForegroundColor Green
  Write-Host "========================================`n" -ForegroundColor Green
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "  1. Copy the URL above (e.g., https://1carz-live-board.vercel.app)"
  Write-Host "  2. Open it in your browser"
  Write-Host "  3. Sign in with: admin1@1carz.com / Admin@2026"
  Write-Host ""
  Write-Host "Then to seed the test accounts, see DEPLOYMENT.md" -ForegroundColor Cyan
  Write-Host ""
} else {
  Write-Host "`n[ERROR] Deploy failed. See output above." -ForegroundColor Red
  exit 1
}

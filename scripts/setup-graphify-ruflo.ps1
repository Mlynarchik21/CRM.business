# One-shot setup: graphify CLI, first graph run, Ruflo init (run from repo root)
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\ggmly\studio-crm"

if (-not (Test-Path node_modules)) { npm install }

# graphify CLI
$pipx = Get-Command pipx -ErrorAction SilentlyContinue
if ($pipx) { pipx install graphifyy } else { pip install graphifyy }
graphify --help | Select-Object -First 15

# skill
& "$PSScriptRoot\sync-graphify-skill.ps1"

# first graph (scoped if full repo is slow)
graphify app lib supabase/migrations types --wiki --no-viz
if (-not (Test-Path graphify-out\GRAPH_REPORT.md)) {
  graphify . --wiki --no-viz
}

# Backup CLAUDE.md before Ruflo may modify it
$crmProgress = Join-Path (Get-Location) "docs\CRM-PROGRESS.md"
New-Item -ItemType Directory -Force -Path (Split-Path $crmProgress) | Out-Null
Copy-Item -Force "CLAUDE.md" $crmProgress
Write-Host "Backed up CLAUDE.md -> docs/CRM-PROGRESS.md"

# Ruflo
$env:CI = "true"
npx ruflo@latest init
npx ruflo --version

Write-Host "Done. Check graphify-out/GRAPH_REPORT.md and .claude/"

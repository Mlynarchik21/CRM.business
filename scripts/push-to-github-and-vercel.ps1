# Push studio-crm to GitHub and hint Vercel deploy
# Run: powershell -ExecutionPolicy Bypass -File scripts\push-to-github-and-vercel.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$report = Join-Path $root "_push_vercel_report.txt"
"=== Push report $(Get-Date -Format o) ===" | Out-File $report -Encoding utf8

function Log($msg) {
  Write-Host $msg
  $msg | Out-File $report -Append -Encoding utf8
}

try {
  Log "Working directory: $root"

  $remote = "https://github.com/Mlynarchik21/CRM.business.git"
  git remote set-url origin $remote
  Log (git remote -v 2>&1 | Out-String)

  git fetch origin 2>&1 | ForEach-Object { Log $_ }
  $branch = git rev-parse --abbrev-ref HEAD
  Log "Branch: $branch"

  Log (git status -sb 2>&1 | Out-String)

  Log "Running tsc..."
  npx tsc --noEmit 2>&1 | ForEach-Object { Log $_ }
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: tsc failed. Fix types before push."
    exit 1
  }

  git add -A
  git reset HEAD -- .env .env.local node_modules graphify-out .next 2>$null
  git reset HEAD -- "**/.env*" 2>$null

  $status = git status --porcelain
  if ($status) {
    git commit -m "feat: CRM UX drawer, leads/clients inline expand, AI guides, fixes"
    Log "Committed: $(git log -1 --oneline)"
  } else {
    Log "Nothing to commit (working tree clean for staged paths)."
    Log "Last commit: $(git log -1 --oneline)"
  }

  Log "Pushing to origin..."
  git push -u origin HEAD 2>&1 | ForEach-Object { Log $_ }
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: git push failed. Run: gh auth login"
    Log "Then: git push -u origin HEAD"
    exit 1
  }

  Log "SUCCESS: https://github.com/Mlynarchik21/CRM.business/tree/$branch"
  Log ""
  Log "Vercel: if project is linked to this repo, deploy starts automatically on push."
  Log "Otherwise: https://vercel.com/new -> Import Mlynarchik21/CRM.business"
  Log "Or: npx vercel link && npx vercel deploy --prod"
}
catch {
  Log "FATAL: $_"
  exit 1
}

Write-Host ""
Write-Host "Report saved: $report" -ForegroundColor Green

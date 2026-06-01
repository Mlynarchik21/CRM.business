$ErrorActionPreference = "Stop"
Set-Location "C:\Users\ggmly\studio-crm"
New-Item -ItemType Directory -Force -Path docs | Out-Null
Copy-Item -Force "CLAUDE.md" "docs\CRM-PROGRESS.md"
Write-Host "OK: docs/CRM-PROGRESS.md ($((Get-Item docs\CRM-PROGRESS.md).Length) bytes)"

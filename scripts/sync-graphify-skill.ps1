# Sync official graphify skill into project (.cursor/skills/graphify/SKILL.md)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = "C:\Users\ggmly\studio-crm"
}
$destDir = Join-Path $root ".cursor\skills\graphify"
$destFile = Join-Path $destDir "SKILL.md"
$url = "https://raw.githubusercontent.com/safishamsi/graphify/v1/skills/graphify/skill.md"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Invoke-WebRequest -Uri $url -OutFile $destFile -UseBasicParsing
Write-Host "Synced: $destFile ($((Get-Item $destFile).Length) bytes)"

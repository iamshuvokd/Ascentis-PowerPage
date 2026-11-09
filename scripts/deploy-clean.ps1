# Uploads ONLY the Power Pages site folders to one environment, from a clean temporary copy.
#
# Why: `pac pages upload --path .` from the repo root also picked up the old exported sites under
# backend/exports/live-pages-check-*, whose stale sitesetting.yml reverted Production site settings
# (OpenRegistrationEnabled, Caption, Web API field lists) on every upload.
#
# Usage (from the repo root, after `npm.cmd run build` and `npm.cmd run check`):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-clean.ps1 -Environment https://org7fc54203.crm8.dynamics.com
#
# Environments: Dev https://org84e19bfd.crm8.dynamics.com | Test https://org3db46cb7.crm8.dynamics.com | Prod https://org7fc54203.crm8.dynamics.com
param(
  [Parameter(Mandatory = $true)][string]$Environment
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$pac = Join-Path $repo 'backend\pac-2.11.2\tools\pac.exe'
if (-not (Test-Path $pac)) { throw "pac.exe not found at $pac" }

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ('ascentis-upload-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
try {
  $folders = '.portalconfig','advanced-forms','content-snippets','page-templates','table-permissions','web-files','web-pages','web-templates','weblink-sets'
  foreach ($f in $folders) { Copy-Item -Recurse -Force (Join-Path $repo $f) (Join-Path $stage $f) }
  $files = 'botconsumer.yml','publishingstate.yml','sitemarker.yml','sitesetting.yml','webpagerule.yml','webrole.yml','website.yml','websiteaccess.yml','websitelanguage.yml'
  foreach ($f in $files) { Copy-Item -Force (Join-Path $repo $f) (Join-Path $stage $f) }
  # Unused leftover theme file that blocks the upload.
  Get-ChildItem (Join-Path $stage 'web-files') -Filter 'GREY-(1)*' -Force | Remove-Item -Recurse -Force

  Write-Host "Uploading clean copy to $Environment ..."
  & $pac pages upload --environment $Environment --path $stage --modelVersion 2
  if ($LASTEXITCODE -ne 0) { throw "pac pages upload failed (exit $LASTEXITCODE)" }
  Write-Host "Upload finished. Now verify: re-check the environment's Site settings (OpenRegistrationEnabled=false, Caption, Web API fields) and clear the portal cache."
}
finally {
  Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
}

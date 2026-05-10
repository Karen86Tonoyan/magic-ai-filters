param(
  [string]$Question = "PageIndex core features and deployment options"
)

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\ktono\Downloads\PageIndex"

Write-Host "[RC2] Build bundle start" -ForegroundColor Cyan

# 1) Quick sanity
python --version

# 2) Core smoke (README) - verifies end-to-end gate logic
python .\alfa_rc2_smoke_test.py
if ($LASTEXITCODE -ne 0) {
  Write-Host "[RC2] Smoke failed" -ForegroundColor Red
  exit 1
}

# 3) One-run wrapper check (README) to ensure run snapshots are created
python .\alfa_rc2_run_document.py --md_path ".\README.md" --question $Question
$runExit = $LASTEXITCODE

# 4) Show latest run folder + key outputs
$latestRun = Get-ChildItem .\results\runs -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host "[RC2] Latest run folder: $($latestRun.FullName)" -ForegroundColor Green

Get-ChildItem .\results | Where-Object {
  $_.Name -like "README_structure.json" -or
  $_.Name -like "README_alfa_section_map.json" -or
  $_.Name -like "README_query_*.json" -or
  $_.Name -like "RC2_SMOKE_REPORT.json"
} | Select-Object Name, Length, LastWriteTime

Get-Content (Join-Path $latestRun.FullName "run_manifest.json") -TotalCount 120

if ($runExit -eq 0) {
  Write-Host "[RC2] Build bundle done: STRICT PASS" -ForegroundColor Green
  exit 0
}
elseif ($runExit -eq 2) {
  Write-Host "[RC2] Build bundle done: STRICT REJECT (expected in negative scenarios)" -ForegroundColor Yellow
  exit 2
}
else {
  Write-Host "[RC2] Build bundle done with pipeline error" -ForegroundColor Red
  exit 1
}

# build-release.ps1 — Build Liga Pro as standalone Windows .exe
# Usage:  .\build-release.ps1
#
# Requirements: Visual Studio 2022 Build Tools (MSVC + Windows 10 SDK 10.0.26100.0)
#               Rust toolchain in %USERPROFILE%\.cargo\bin

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot

# 1) Read version from src/lib/version.ts so the banner stays in sync
$versionLine = Select-String -Path "src/lib/version.ts" -Pattern 'APP_VERSION\s*=\s*"([^"]+)"'
$appVersion  = if ($versionLine) { $versionLine.Matches[0].Groups[1].Value } else { "unknown" }
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Liga Pro Build  -  v$appVersion" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 2) Configure MSVC environment (matches the build that produced earlier liga-pro.exe)
$msvcRoot = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC"
$msvcVerFile = Join-Path "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build" "Microsoft.VCToolsVersion.default.txt"
if (-not (Test-Path $msvcVerFile)) { throw "MSVC Build Tools not found at $msvcVerFile" }
$msvcVer = (Get-Content $msvcVerFile).Trim()
$sdkVer  = "10.0.26100.0"

$env:LIB     = "$msvcRoot\$msvcVer\lib\x64;C:\Program Files (x86)\Windows Kits\10\Lib\$sdkVer\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\$sdkVer\ucrt\x64"
$env:INCLUDE = "$msvcRoot\$msvcVer\include;C:\Program Files (x86)\Windows Kits\10\Include\$sdkVer\ucrt;C:\Program Files (x86)\Windows Kits\10\Include\$sdkVer\um;C:\Program Files (x86)\Windows Kits\10\Include\$sdkVer\shared"
$env:Path    = "$env:USERPROFILE\.cargo\bin;$msvcRoot\$msvcVer\bin\HostX64\x64;" + $env:Path

# 3) Frontend build (Vite) — Tauri also runs this via beforeBuildCommand, but doing it
#    explicitly first surfaces TypeScript errors before the long Rust compile.
Write-Host "`n[1/2] Building frontend (vite)..." -ForegroundColor Yellow
& npx vite build
if ($LASTEXITCODE -ne 0) { throw "Vite build failed (exit $LASTEXITCODE)" }

# 4) Tauri build (Rust release + bundler => .exe + installer)
Write-Host "`n[2/2] Building Tauri release bundle (Rust)..." -ForegroundColor Yellow
& npx tauri build
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed (exit $LASTEXITCODE)" }

# 5) Locate produced artifacts and copy to /release/ with version suffix
$rustExe = "src-tauri\target\release\liga-pro.exe"
if (-not (Test-Path $rustExe)) { throw "Expected $rustExe not found after build" }

$releaseDir = "release"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$outExe = Join-Path $releaseDir "liga-pro-v$appVersion.exe"
Copy-Item $rustExe $outExe -Force

# Look for installers (NSIS .exe / MSI)
$bundleDir = "src-tauri\target\release\bundle"
$installers = @()
if (Test-Path $bundleDir) {
  $installers += Get-ChildItem -Path $bundleDir -Recurse -Include *.exe,*.msi -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host " BUILD SUCCESSFUL  -  v$appVersion" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host " Standalone EXE : $outExe" -ForegroundColor Green
$exeInfo = Get-Item $outExe
Write-Host (" Size           : {0:N2} MB" -f ($exeInfo.Length / 1MB)) -ForegroundColor Green
if ($installers.Count -gt 0) {
  Write-Host " Installers:" -ForegroundColor Green
  foreach ($i in $installers) {
    Write-Host ("   - {0}  ({1:N2} MB)" -f $i.FullName, ($i.Length / 1MB)) -ForegroundColor Green
  }
}
Write-Host ""

Pop-Location

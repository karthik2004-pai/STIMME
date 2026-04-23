# STIMME - One-Click Launcher

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "   STIMME - AI Audio Intelligence Suite" -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

$env:Path = "C:\node-v22.15.0-win-x64;" + $env:Path

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "  Starting backend server (port 8000)..." -ForegroundColor Yellow
$backendDir = Join-Path $root "backend"
$backend = Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $backendDir -PassThru -WindowStyle Minimized
Write-Host "  Backend PID: $($backend.Id)" -ForegroundColor DarkGray
Write-Host "  Waiting for backend to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3

Write-Host "  Starting frontend (port 3000)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Green
Write-Host "   Open: http://localhost:3000" -ForegroundColor Green
Write-Host "   Landing page + Full App - All in one!" -ForegroundColor Green
Write-Host "  =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor DarkGray
Write-Host ""

$frontendDir = Join-Path $root "landing"

try {
    Set-Location $frontendDir
    npm run dev
} finally {
    Write-Host ""
    Write-Host "Stopping backend server..." -ForegroundColor Yellow
    if ($backend -and !$backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Stimme stopped." -ForegroundColor Cyan
}

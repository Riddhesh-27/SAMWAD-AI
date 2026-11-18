# SAMVAD AI - One-Click Development Launcher for Windows
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             SAMVAD AI Launcher                          " -ForegroundColor Green
Write-Host "  Smart AI Multimodal Vision Assistant for Sign Language  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot

# Ensure Node.js is on PATH
$env:Path = "C:\Program Files\nodejs;" + $env:Path

# Check Python environment
$PythonExe = Join-Path $WorkspaceRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "[!] Virtual environment not found. Initializing..." -ForegroundColor Yellow
    python -m venv "$WorkspaceRoot\backend\.venv"
    & "$WorkspaceRoot\backend\.venv\Scripts\pip.exe" install -r "$WorkspaceRoot\backend\requirements.txt"
}

Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\backend'; & '$PythonExe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot\frontend'; `$env:Path = 'C:\Program Files\nodejs;' + `$env:Path; npm run dev -- --host 127.0.0.1 --port 5173"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[OK] SAMVAD AI is starting up!" -ForegroundColor Cyan
Write-Host "  - Frontend Dashboard: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  - Backend API Health: http://127.0.0.1:8000/api/health" -ForegroundColor White
Write-Host "  - Swagger API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""

Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Process "http://127.0.0.1:5173"

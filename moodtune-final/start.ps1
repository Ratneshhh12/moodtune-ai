# Get the directory of the script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting MoodTune AI Backend..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd /d `"$scriptDir\backend`" && python app.py"

Write-Host "Starting MoodTune AI Frontend..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd /d `"$scriptDir\frontend`" && npm start"

Write-Host "Both servers have been launched in separate terminal windows!" -ForegroundColor Cyan

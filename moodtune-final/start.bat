@echo off
echo Starting MoodTune AI Backend...
start cmd /k "cd /d "%~dp0backend" && python app.py"

echo Starting MoodTune AI Frontend...
start cmd /k "cd /d "%~dp0frontend" && npm start"

echo Both servers have been launched in separate terminal windows!

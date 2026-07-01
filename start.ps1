$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
cd "$scriptDir\moodtune-final"
.\start.ps1

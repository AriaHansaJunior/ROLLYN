@echo off
title SPECTRUM Engine 4.0 AI Microservice
cd /d "%~dp0"
echo =======================================================
echo    Starting SPECTRUM Engine AI Microservice (Port 8001)
echo =======================================================
python -m uvicorn spectrum_engine.app:app --host 127.0.0.1 --port 8001 --reload
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start SPECTRUM microservice.
    pause
)

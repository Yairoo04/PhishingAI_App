@echo off
chcp 65001 >nul
title PhishingAI Detection System

echo ===================================================
echo     Khoi chay PhishingAI Detection System
echo ===================================================

cd /d "%~dp0"
set "PYTHONPATH=backend"

call .\venv\Scripts\activate.bat
echo Dang mo may chu tai http://localhost:5001 ...
python backend\app.py
pause


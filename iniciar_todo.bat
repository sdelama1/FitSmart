@echo off
title FitSmart - Lanzador Global
echo Iniciando todos los servicios de FitSmart...
start "FitSmart - ML Service (FastAPI)" cmd /k "cd /d %~dp0ml-service && call .venv\Scripts\activate.bat && uvicorn main:app --port 8000"
timeout /t 2 >nul
start "FitSmart - Backend (Node.js)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 >nul
start "FitSmart - Frontend (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Todos los servicios estan abriendose en ventanas separadas.
echo Abre http://localhost:5173 en tu navegador.
timeout /t 5

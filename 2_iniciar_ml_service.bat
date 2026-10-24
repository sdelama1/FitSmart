@echo off
title FitSmart - 2. ML Service (FastAPI en puerto 8000)
cd /d "%~dp0ml-service"
call .venv\Scripts\activate.bat
echo Iniciando servicio de Machine Learning en http://localhost:8000 ...
uvicorn main:app --port 8000 --reload
pause

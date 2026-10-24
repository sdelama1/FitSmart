@echo off
title FitSmart - Pruebas Unitarias y de Integracion
echo ==============================================
echo 1. Pruebas de Machine Learning (ml-service)
echo ==============================================
cd /d "%~dp0ml-service"
call .venv\Scripts\activate.bat
python -m pytest tests
echo.
echo ==============================================
echo 2. Pruebas de Backend
echo ==============================================
cd /d "%~dp0backend"
call npm test
echo.
pause

@echo off
title FitSmart - 1. Entrenar Modelo
cd /d "%~dp0ml-service"
echo Entrenando el modelo de Machine Learning con todos los datos...
call .venv\Scripts\activate.bat
python entrenar.py
echo.
echo Entrenamiento completado. Presiona una tecla para salir.
pause

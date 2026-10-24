@echo off
title FitSmart - Inicializar Base de Datos
cd /d "%~dp0backend"
echo Creando tablas y catalogo inicial en PostgreSQL...
call npm run db:init
echo.
echo Deseas cargar los datos de ejemplo para la demostracion (usuario demo, sesiones, alertas)? (S/N)
set /p opc="Respuesta: "
if /I "%opc%"=="S" (
    call npm run db:seed
)
pause

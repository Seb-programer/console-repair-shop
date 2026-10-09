@echo off
rem Servidor de DEMOSTRACION (datos inventados): base consolas_demo y fotos en uploads-demo
title Consolas App - DEMO (no cerrar)
cd /d "%~dp0"
set "SERVIR_FRONTEND=1"
set "NODE_ENV=production"
set "PORT=5174"
set "HOST=0.0.0.0"
set "DB_NAME=consolas_demo"
set "UPLOADS_DIR=uploads-demo"
node src\server.js

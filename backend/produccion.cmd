@echo off
rem Servidor unico de Consolas App en modo produccion (pagina web + API)
title Consolas App - Servidor (no cerrar)
cd /d "%~dp0"
set "SERVIR_FRONTEND=1"
set "NODE_ENV=production"
set "PORT=5173"
set "HOST=0.0.0.0"
node src\server.js

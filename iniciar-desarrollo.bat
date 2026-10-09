@echo off
title Consolas App - Desarrollo
cd /d "%~dp0"

echo Iniciando Consolas App en MODO DESARROLLO (para trabajar en el codigo)...
echo No uses este modo para publicar en internet.

rem Si el puerto 5173 ya esta ocupado (p. ej. la app en modo produccion), Vite usaria otro
rem puerto y el navegador abriria la version de produccion sin avisar.
netstat -ano | find "LISTENING" | find ":5173 " >nul
if not errorlevel 1 (
  echo.
  echo [ALTO] El puerto 5173 ya esta en uso ^(la app ya esta encendida, quiza en modo normal^).
  echo        Cierra la ventana "Consolas App - Servidor" y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

rem 1. Base de datos (MySQL de XAMPP), solo si no esta encendida
tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
if errorlevel 1 (
  echo  - Encendiendo MySQL...
  start "MySQL" /min "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
  timeout /t 4 >nul
) else (
  echo  - MySQL ya estaba encendido
)

rem 2. API (backend)
echo  - Encendiendo la API...
start "Consolas - API (no cerrar)" /min cmd /k "cd /d "%~dp0backend" && npm run dev"

rem 3. Aplicacion web (frontend)
echo  - Encendiendo la aplicacion web...
start "Consolas - Web (no cerrar)" /min cmd /k "cd /d "%~dp0frontend" && npm run dev"

rem 4. Abrir el navegador
timeout /t 6 >nul
start "" http://localhost:5173

echo.
echo Listo. La aplicacion se abrio en el navegador: http://localhost:5173
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "IP_LOCAL=%%i"
if defined IP_LOCAL (
  echo.
  echo Desde otros equipos o celulares de la misma red ^(WiFi o cable^):
  echo     http://%IP_LOCAL%:5173
)
echo.
echo Para apagarla, cierra las ventanas "Consolas - API" y "Consolas - Web".
timeout /t 20 >nul

@echo off
setlocal EnableExtensions
title Consolas App
cd /d "%~dp0"

echo Iniciando Consolas App...

rem Si ya hay algo en el puerto 5173, la app ya esta encendida
netstat -ano | find "LISTENING" | find ":5173 " >nul
if not errorlevel 1 (
  echo  - La aplicacion ya estaba encendida.
  goto :abrir
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

rem 2. Preparar la version final de la pagina web
echo  - Preparando la pagina web...
pushd frontend
call npm run build --silent >nul 2>&1
if errorlevel 1 (
  popd
  echo [ERROR] No se pudo preparar la pagina web. Ejecuta iniciar-desarrollo.bat para ver el detalle.
  pause
  exit /b 1
)
popd

rem 3. Servidor unico (pagina web + API) en el puerto 5173
echo  - Encendiendo el servidor...
start "Consolas App - Servidor (no cerrar)" /min cmd /k ""%~dp0backend\produccion.cmd""

rem Esperar a que responda (max. 30 s)
set /a INTENTOS=0
:esperar
timeout /t 1 >nul
set /a INTENTOS+=1
curl.exe -s -o nul -m 2 http://localhost:5173/api/publico/negocio && goto :abrir
if %INTENTOS% lss 30 goto :esperar
echo [AVISO] El servidor tarda en responder. Revisa la ventana "Consolas App - Servidor".

:abrir
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
echo Para publicarla en internet usa "publicar.bat".
echo Para apagarla, cierra la ventana "Consolas App - Servidor".
timeout /t 20 >nul

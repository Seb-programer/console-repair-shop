@echo off
setlocal EnableExtensions
title Consolas App - Modo DEMO
cd /d "%~dp0"

set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DEMO_DB=consolas_demo"

echo ============================================
echo   Consolas App - MODO DEMO (datos inventados)
echo   Tus datos reales NO se tocan.
echo ============================================
echo.

rem Si la demo ya esta encendida, solo abrir el navegador
netstat -ano | find "LISTENING" | find ":5174 " >nul
if not errorlevel 1 (
  echo  - La demo ya estaba encendida.
  goto :abrir
)

tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
if errorlevel 1 (
  echo  - Encendiendo MySQL...
  start "MySQL" /min "%MYSQL_BIN%\mysqld.exe" --defaults-file="%MYSQL_BIN%\my.ini" --standalone
  timeout /t 5 >nul
)

rem 1. Recrear la base de demostracion desde cero (solo consolas_demo)
echo  - Preparando la base de datos de demostracion...
set "TMP_SCHEMA=%TEMP%\consolas_demo_schema.sql"
powershell -NoProfile -Command "$t=[IO.File]::ReadAllText('%~dp0database\schema.sql') -replace 'consolas_db','%DEMO_DB%'; [IO.File]::WriteAllText($env:TMP_SCHEMA,$t,(New-Object Text.UTF8Encoding $false))"
"%MYSQL_BIN%\mysql.exe" -u root -e "DROP DATABASE IF EXISTS `%DEMO_DB%`"
"%MYSQL_BIN%\mysql.exe" -u root --default-character-set=utf8mb4 < "%TMP_SCHEMA%"
if errorlevel 1 goto :error
"%MYSQL_BIN%\mysql.exe" -u root --default-character-set=utf8mb4 %DEMO_DB% < "%~dp0database\demo\demo.sql"
if errorlevel 1 goto :error
del /q "%TMP_SCHEMA%" 2>nul

rem 2. Fotos de demostracion en su propia carpeta
echo  - Copiando fotos de demostracion...
if exist "%~dp0backend\uploads-demo" rmdir /s /q "%~dp0backend\uploads-demo"
robocopy "%~dp0database\demo\fotos" "%~dp0backend\uploads-demo" /E /NFL /NDL /NJH /NJS /NP >nul

rem 3. Pagina web compilada (si falta)
if not exist "%~dp0frontend\dist\index.html" (
  echo  - Preparando la pagina web...
  pushd frontend
  call npm run build --silent >nul 2>&1
  popd
)

rem 4. Servidor de la demo en el puerto 5174
echo  - Encendiendo el servidor de la demo...
start "Consolas App - DEMO (no cerrar)" /min cmd /k ""%~dp0backend\demo-servidor.cmd""
set /a INTENTOS=0
:esperar
timeout /t 1 >nul
set /a INTENTOS+=1
curl.exe -s -o nul -m 2 http://localhost:5174/api/publico/negocio && goto :abrir
if %INTENTOS% lss 30 goto :esperar
echo [AVISO] La demo tarda en responder. Revisa la ventana "Consolas App - DEMO".

:abrir
if not defined SIN_NAVEGADOR start "" http://localhost:5174
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "IP_LOCAL=%%i"
echo.
echo ============================================
echo   DEMO lista:  http://localhost:5174
if defined IP_LOCAL echo   Celular ^(misma red^):  http://%IP_LOCAL%:5174
echo.
echo   Usuarios demo: admin / tecnico / operario
echo   Contrasena:    Demo1234
echo   Detalles para el video: database\demo\README.md
echo ============================================
echo.
echo Cada vez que abras la demo, los datos vuelven a su estado inicial.
echo Para apagarla, cierra la ventana "Consolas App - DEMO".
timeout /t 30 >nul
exit /b 0

:error
echo [ERROR] No se pudo preparar la base de demostracion.
pause
exit /b 1

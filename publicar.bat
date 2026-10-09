@echo off
setlocal EnableExtensions
title Consolas App - Publicada en internet
cd /d "%~dp0"

set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"
set "LOG=%TEMP%\consolas-tunel.log"

echo ============================================
echo   Consolas App - Publicar en internet
echo ============================================
echo.

if not exist "%CLOUDFLARED%" (
  echo [FALTA] cloudflared no esta instalado.
  echo         Instalalo con:  winget install Cloudflare.cloudflared
  goto :fin_error
)

rem 1. La app tiene que estar encendida
curl.exe -s -o nul -m 3 http://localhost:5173/api/publico/negocio
if errorlevel 1 (
  echo  - La aplicacion no estaba encendida. Encendiendola...
  call "%~dp0iniciar.bat"
)
curl.exe -s -o nul -m 3 http://localhost:5173/api/publico/negocio
if errorlevel 1 (
  echo [ERROR] La aplicacion no responde en http://localhost:5173
  goto :fin_error
)

rem 2. Nunca publicar el modo desarrollo (solo produccion envia Content-Security-Policy)
curl.exe -s -I -m 3 http://localhost:5173/ | find /i "Content-Security-Policy" >nul
if errorlevel 1 (
  echo [ALTO] La aplicacion esta en MODO DESARROLLO, que no es seguro para internet.
  echo        Cierra las ventanas "Consolas - API" y "Consolas - Web",
  echo        abre la app con el icono "Consolas App" y vuelve a ejecutar este archivo.
  goto :fin_error
)

rem 3. Nunca publicar con contrasenas de ejemplo
echo  - Revisando contrasenas...
pushd backend
node scripts\verificar-claves.js
if errorlevel 2 (
  popd
  echo.
  echo [ERROR] No se pudieron revisar las contrasenas ^(la base de datos no responde^).
  echo        Comprueba que MySQL esta encendido y vuelve a ejecutar este archivo.
  goto :fin_error
)
if errorlevel 1 (
  popd
  echo.
  echo [ALTO] Hay usuarios con contrasenas de ejemplo. Cualquiera en internet podria entrar.
  echo        Entra al panel ^> Usuarios y cambialas ^(o desactiva esos usuarios^).
  echo        Despues vuelve a ejecutar este archivo.
  goto :fin_error
)
popd

rem 4. Abrir el tunel de Cloudflare
echo  - Abriendo el tunel de Cloudflare...
if exist "%LOG%" del /q "%LOG%"
rem El vigilante cierra el tunel cuando desaparece esta ventana (tecla, X o cualquier cierre)
set "PADRE="
for /f %%p in ('powershell -NoProfile -Command "$a=(Get-CimInstance Win32_Process -Filter ('ProcessId='+$PID)).ParentProcessId; (Get-CimInstance Win32_Process -Filter ('ProcessId='+$a)).ParentProcessId"') do set "PADRE=%%p"
if not defined PADRE (
  echo [ERROR] No se pudo preparar el tunel.
  goto :fin_error
)
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0herramientas\tunel.ps1" -Padre %PADRE% -Log "%LOG%" -Cloudflared "%CLOUDFLARED%"

set "URL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$f=$env:LOG; for($i=0;$i -lt 45;$i++){ Start-Sleep 1; if(Test-Path $f){ $m=Select-String -Path $f -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1; if($m){ $m.Matches[0].Value; break } } }"`) do set "URL=%%u"

if not defined URL (
  echo [ERROR] No se obtuvo la direccion publica. Revisa tu conexion a internet.
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='cloudflared.exe'\" | Where-Object { $_.CommandLine -like '*consolas-tunel.log*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
  goto :fin_error
)

echo %URL%| clip
echo.
echo ============================================================
echo   TU APLICACION ESTA EN INTERNET:
echo.
echo     %URL%
echo.
echo   (La direccion ya esta copiada: puedes pegarla con Ctrl+V)
echo ============================================================
echo.
echo  - Clientes: pagina principal y "Consulta tu consola".
echo  - Personal: "Acceso personal" al final de la pagina.
echo.
echo  Esta direccion es TEMPORAL: cambia cada vez que publicas.
echo  Tarda hasta un minuto en funcionar la primera vez.
echo.
start "" "%URL%"
echo Para DEJAR DE PUBLICAR pulsa una tecla o cierra esta ventana.
echo ^(La app sigue funcionando en tu red local.^)
pause >nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='cloudflared.exe'\" | Where-Object { $_.CommandLine -like '*consolas-tunel.log*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo La aplicacion ya no esta en internet.
timeout /t 4 >nul
exit /b 0

:fin_error
echo.
pause
exit /b 1

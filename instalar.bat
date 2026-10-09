@echo off
setlocal EnableExtensions
title Consolas App - Instalar
cd /d "%~dp0"

set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=consolas_db"
set "CREAR_ACCESO=1"
rem Parametros opcionales (para pruebas): instalar.bat [nombre_base] [sin-acceso]
if not "%~1"=="" set "DB=%~1"
if /i "%~2"=="sin-acceso" set "CREAR_ACCESO=0"
set "RESPALDO=%~dp0database\respaldo\consolas_db_respaldo.sql"

echo ============================================
echo   Consolas App - Instalacion en este equipo
echo ============================================
echo Carpeta: %~dp0
echo.

rem 1. Requisitos
where node >nul 2>nul
if errorlevel 1 (
  echo [FALTA] Node.js no esta instalado.
  echo         Descargalo de https://nodejs.org ^(version LTS^), instalalo
  echo         y vuelve a ejecutar este archivo.
  goto :fin_error
)
for /f %%v in ('node -v') do echo  - Node.js %%v encontrado

if not exist "%MYSQL_BIN%\mysql.exe" (
  echo [FALTA] XAMPP no esta instalado en C:\xampp.
  echo         Descargalo de https://www.apachefriends.org, instalalo en C:\xampp
  echo         y vuelve a ejecutar este archivo.
  goto :fin_error
)
echo  - XAMPP encontrado

if not exist "%RESPALDO%" (
  echo [ERROR] No encuentro la copia de la base de datos:
  echo         %RESPALDO%
  echo         Usa una carpeta creada con "exportar.bat".
  goto :fin_error
)

rem 2. Encender MySQL si hace falta
tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
if errorlevel 1 (
  echo  - Encendiendo MySQL...
  start "MySQL" /min "%MYSQL_BIN%\mysqld.exe" --defaults-file="%MYSQL_BIN%\my.ini" --standalone
  timeout /t 6 >nul
)
"%MYSQL_BIN%\mysql.exe" -u root -e "SELECT 1" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No puedo conectarme a MySQL. Abre el panel de XAMPP, enciende MySQL
  echo         y vuelve a ejecutar este archivo.
  goto :fin_error
)

rem 3. Base de datos: avisar antes de reemplazar una existente
"%MYSQL_BIN%\mysql.exe" -u root -N -e "SHOW DATABASES LIKE '%DB%'" | find /i "%DB%" >nul
if not errorlevel 1 (
  echo.
  echo [ATENCION] En este equipo ya existe la base de datos "%DB%".
  echo            Si continuas, sus datos se REEMPLAZARAN por los de la copia.
  choice /c SN /m "Reemplazar la base de datos existente"
  if errorlevel 2 (
    echo Instalacion cancelada. No se cambio nada.
    goto :fin_error
  )
)
echo  - Importando la base de datos "%DB%"...
"%MYSQL_BIN%\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS `%DB%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
if errorlevel 1 goto :error_bd
"%MYSQL_BIN%\mysql.exe" -u root --default-character-set=utf8mb4 "%DB%" < "%RESPALDO%"
if errorlevel 1 goto :error_bd

rem 4. Configuracion del backend
if not exist "backend\.env" (
  echo  - Creando configuracion nueva del backend...
  copy /y "backend\.env.example" "backend\.env" >nul
  powershell -NoProfile -Command "$s=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'); (Get-Content 'backend\.env') -replace '^JWT_SECRET=.*',('JWT_SECRET='+$s) -replace '^DB_NAME=.*',('DB_NAME=%DB%') | Set-Content -Encoding ascii 'backend\.env'"
)
if not exist "backend\uploads" mkdir "backend\uploads"

rem 5. Dependencias (descarga de internet, tarda unos minutos)
echo  - Instalando componentes del servidor (necesita internet)...
pushd backend
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 ( popd & goto :error_npm )
popd
echo  - Instalando componentes de la pagina web (necesita internet)...
pushd frontend
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 ( popd & goto :error_npm )
popd

rem 6. Acceso directo en el Escritorio
if "%CREAR_ACCESO%"=="1" (
  for /f "usebackq delims=" %%d in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"`) do set "ESCRITORIO=%%d"
  call :crear_acceso
)

echo.
echo ============================================
echo   Instalacion terminada
echo ============================================
if "%CREAR_ACCESO%"=="1" echo Abre la aplicacion con el icono "Consolas App" del Escritorio.
echo.
if not defined SIN_PAUSA pause
exit /b 0

:crear_acceso
(
  echo @echo off
  echo call "%~dp0iniciar.bat"
) > "%ESCRITORIO%\Consolas App.bat"
echo  - Acceso directo creado en el Escritorio
exit /b 0

:error_bd
echo [ERROR] Fallo la importacion de la base de datos.
goto :fin_error

:error_npm
echo [ERROR] Fallo la instalacion de componentes. Revisa la conexion a internet
echo         y vuelve a ejecutar este archivo.
goto :fin_error

:fin_error
echo.
if not defined SIN_PAUSA pause
exit /b 1

@echo off
setlocal EnableExtensions
title Consolas App - Exportar copia
cd /d "%~dp0"

set "MYSQL_BIN=C:\xampp\mysql\bin"
set "DB=consolas_db"
set "DESTINO=%USERPROFILE%\Documents\consolas-respaldos"

echo ============================================
echo   Consolas App - Exportar copia completa
echo ============================================
echo.

if not exist "%MYSQL_BIN%\mysqldump.exe" (
  echo [ERROR] No encuentro XAMPP en C:\xampp. No se puede exportar la base de datos.
  goto :fin_error
)

rem Fecha y hora para el nombre del archivo
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set "FECHA=%%i"

rem 1. Asegurar que MySQL esta encendido
tasklist /fi "imagename eq mysqld.exe" | find /i "mysqld.exe" >nul
if errorlevel 1 (
  echo  - Encendiendo MySQL...
  start "MySQL" /min "%MYSQL_BIN%\mysqld.exe" --defaults-file="%MYSQL_BIN%\my.ini" --standalone
  timeout /t 5 >nul
)

set "TEMPORAL=%TEMP%\consolas-export-%FECHA%"
set "COPIA=%TEMPORAL%\consolas-app"
if exist "%TEMPORAL%" rmdir /s /q "%TEMPORAL%"
mkdir "%COPIA%" || goto :fin_error

rem 2. Copiar el programa y las fotos (sin node_modules ni archivos generados)
echo  - Copiando el programa, las fotos y los videos...
robocopy "%~dp0." "%COPIA%" /E /XD node_modules dist .git respaldo /XF *.log /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [ERROR] Fallo la copia de archivos.
  goto :fin_error
)

rem 3. Exportar la base de datos
echo  - Exportando la base de datos %DB%...
mkdir "%COPIA%\database\respaldo" 2>nul
"%MYSQL_BIN%\mysqldump.exe" -u root --default-character-set=utf8mb4 --single-transaction --routines --triggers --add-drop-table "%DB%" --result-file="%COPIA%\database\respaldo\consolas_db_respaldo.sql"
if errorlevel 1 (
  echo [ERROR] No se pudo exportar la base de datos. Revisa que MySQL este encendido.
  goto :fin_error
)

rem 4. Comprimir todo en un solo .zip
if not exist "%DESTINO%" mkdir "%DESTINO%"
set "ZIP=%DESTINO%\consolas-app_%FECHA%.zip"
echo  - Comprimiendo...
"%SystemRoot%\System32\tar.exe" -a -c -f "%ZIP%" -C "%TEMPORAL%" consolas-app
if errorlevel 1 (
  echo [ERROR] No se pudo crear el archivo .zip
  goto :fin_error
)
rmdir /s /q "%TEMPORAL%"

echo.
echo ============================================
echo   Copia creada correctamente:
echo   %ZIP%
echo ============================================
echo.
echo Para llevarla a otro equipo: copia ese .zip, descomprimelo
echo y ejecuta "instalar.bat" que esta dentro de la carpeta consolas-app.
echo.
echo IMPORTANTE: el .zip contiene los datos de tus clientes.
echo Guardalo en un lugar seguro y no lo compartas.
echo.
if not defined SIN_PAUSA explorer "%DESTINO%"
if not defined SIN_PAUSA pause
exit /b 0

:fin_error
echo.
echo La exportacion no se completo.
if not defined SIN_PAUSA pause
exit /b 1

@echo off

REM Check for running RWS-Pid-Tuner-GUI.exe and terminate it before building
tasklist /FI "IMAGENAME eq RWS-Pid-Tuner-GUI.exe" 2>NUL | find /I "RWS-Pid-Tuner-GUI.exe" >NUL
if %ERRORLEVEL%==0 (
  echo Found running RWS-Pid-Tuner-GUI.exe - attempting to terminate...
  taskkill /F /IM "RWS-Pid-Tuner-GUI.exe" >NUL 2>&1
  if %ERRORLEVEL%==0 (
    echo Successfully terminated running instance.
    REM give the OS a moment to release file handles
    timeout /t 1 /nobreak >NUL
  ) else (
    echo Failed to terminate running instance. Please close it and retry.
    pause
    exit /b 1
  )
)

REM Build frontend first
echo.
echo [1/4] Building frontend...
cd ..\frontend
call npm run build
if %errorlevel% neq 0 (
    echo Error: Frontend build failed
    exit /b 1
)

REM Copy frontend build to backend/web
echo.
echo [2/4] Copying frontend build to backend...
cd ..\backend
if exist web rmdir /s /q web
mkdir web
xcopy /e /i /y ..\frontend\dist\* web\

REM Install Python dependencies
echo.
echo [3/4] Installing Python dependencies...
python -m pip install -r requirements.txt

REM Create build directory and build executable with PyInstaller
echo.
echo [4/4] Building executable with PyInstaller...
if exist build_temp rmdir /s /q build_temp
mkdir build_temp
pyinstaller rws_pid_tuner.spec --clean --noconfirm --distpath build_temp\dist --workpath build_temp\build
if %errorlevel% neq 0 (
    echo Error: PyInstaller build failed
    exit /b 1
)

REM Copy final executable to backend directory
echo.
echo Copying executable to backend directory...
copy "build_temp\dist\RWS-Pid-Tuner-GUI.exe" "RWS-Pid-Tuner-GUI.exe"
if %errorlevel% neq 0 (
    echo Error: Failed to copy executable
    exit /b 1
)

REM Clean up build artifacts
echo.
echo Cleaning up build artifacts...
rmdir /s /q build_temp
if exist web rmdir /s /q web

echo.
echo Build completed successfully!
echo Executable location: backend\RWS-Pid-Tuner-GUI.exe
pause
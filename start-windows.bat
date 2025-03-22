@echo off
echo Starting ResearchAI application...

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.8+ and try again.
    exit /b 1
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js and try again.
    exit /b 1
)

:: Run the structure check script
echo Checking project structure...
node check-structure.js

:: Install frontend dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

:: Install backend dependencies
echo Installing backend dependencies...
cd api
pip install -r requirements.txt
cd ..

:: Build the frontend
echo Building Next.js frontend...
call npx next build

:: Create static directory if it doesn't exist
if not exist api\static mkdir api\static

:: Copy built files to API static directory
echo Copying built files to API static directory...
if exist out\* (
  xcopy /E /I /Y out\* api\static\
) else (
  echo Warning: No build output found in 'out' directory
)

:: Start the FastAPI server
echo Starting FastAPI server...
:: Make sure we're in the correct directory
cd %~dp0
python -m api.run


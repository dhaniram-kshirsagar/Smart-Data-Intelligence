@echo off
echo Cleaning static files and build outputs...

REM Delete Next.js build output
if exist .next (
    echo Removing .next directory...
    rmdir /s /q .next
)

REM Delete static export output
if exist out (
    echo Removing out directory...
    rmdir /s /q out
)

REM Clean static directory
if exist static (
    echo Cleaning static directory...
    rmdir /s /q static
    mkdir static
)

REM Clean data directory if it exists and has content
if exist data (
    echo Cleaning data directory...
    rmdir /s /q data
    mkdir data
)

REM Clean any cache files
if exist .vscode\*.log (
    echo Removing VS Code log files...
    del /q .vscode\*.log
)

echo Cleanup complete!
pause

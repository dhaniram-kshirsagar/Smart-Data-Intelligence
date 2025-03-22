@echo off
echo Cleaning static files, cache, and build outputs...

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

REM Clean node_modules (optional - uncomment if you want to remove dependencies)
REM echo Removing node_modules...
REM if exist node_modules rmdir /s /q node_modules

REM Clean package lock files
echo Removing package lock files...
if exist package-lock.json del /f package-lock.json
if exist yarn.lock del /f yarn.lock

REM Clean build artifacts and dist folders
if exist dist (
    echo Removing dist directory...
    rmdir /s /q dist
)
if exist build (
    echo Removing build directory...
    rmdir /s /q build
)

REM Clean any cache files
echo Cleaning cache files...
if exist .vscode\*.log (
    echo Removing VS Code log files...
    del /q .vscode\*.log
)

REM Clean npm/yarn cache
echo Cleaning npm cache...
npm cache clean --force

REM Clean browser cache files if they exist
if exist .cache (
    echo Removing .cache directory...
    rmdir /s /q .cache
)

REM Clean temporary files
if exist temp (
    echo Removing temp directory...
    rmdir /s /q temp
)
if exist tmp (
    echo Removing tmp directory...
    rmdir /s /q tmp
)

REM Clean any generated files
echo Cleaning generated files...
if exist *.generated.* del /f *.generated.*

echo Cleanup complete!
echo.
echo Note: You may need to run 'npm install' or 'yarn' to reinstall dependencies.
pause

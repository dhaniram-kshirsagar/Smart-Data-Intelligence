@echo off
REM Build the Next.js app
echo Building Next.js frontend...
npx next build

REM Create the static directory in the API folder if it doesn't exist
if not exist api\static mkdir api\static

REM Copy the built files to the API static directory
echo Copying built files to API static directory...
xcopy /E /I /Y "out\*" "api\static\"

echo Frontend build complete and copied to API static directory!

@echo off
echo.
echo ====================================================
echo         APPLYING TYPESCRIPT ERROR FIXES
echo ====================================================
echo.

echo Running automated fixes...
node scripts/fix-typescript-errors.js --verbose

echo.
echo ====================================================
echo              RUNNING TYPESCRIPT CHECK
echo ====================================================
echo.

npx tsc --noEmit

echo.
echo ====================================================
echo If any errors remain, please review the output above
echo ==================================================== 
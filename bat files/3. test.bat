cd ..
call npm run build
call npm run "jest-test"
pause
REM cmd /k npm run "jest-test"
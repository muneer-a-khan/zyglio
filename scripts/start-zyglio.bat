@echo off
echo Starting Zyglio self-hosted services...
docker-compose up -d
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Services started successfully!
    echo Zyglio is available at: http://localhost:3000
    echo Monitor with: docker-compose ps
) else (
    echo Failed to start services. Check logs with: docker-compose logs
)
pause 
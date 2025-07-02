@echo off
echo Zyglio Service Status:
echo =====================
docker-compose ps
echo.
echo Service Health:
echo ==============
curl -s http://localhost:3000/api/health 2>nul || echo Main app not responding
curl -s http://localhost:8000/health 2>nul || echo vLLM not responding  
curl -s http://localhost:9000/health 2>nul || echo Whisper not responding
curl -s http://localhost:8020/health 2>nul || echo XTTS not responding
pause 
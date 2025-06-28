# Zyglio Self-Hosting Setup Script for Windows PowerShell
# This script prepares everything needed for local AI hosting on Windows

param(
    [switch]$SkipChecks
)

Write-Host "🚀 Setting up Zyglio for self-hosting on Windows..." -ForegroundColor Cyan

# Check for required dependencies
function Check-Dependencies {
    Write-Host "📋 Checking dependencies..." -ForegroundColor Yellow
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker detected: $dockerVersion" -ForegroundColor Green
        } else {
            throw "Docker not found"
        }
    } catch {
        Write-Host "❌ Docker is required but not installed. Please install Docker Desktop first." -ForegroundColor Red
        Write-Host "   Download from: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -ForegroundColor Yellow
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker Compose detected: $composeVersion" -ForegroundColor Green
        } else {
            throw "Docker Compose not found"
        }
    } catch {
        Write-Host "❌ Docker Compose is required but not installed." -ForegroundColor Red
        Write-Host "   It should come with Docker Desktop. Try reinstalling Docker Desktop." -ForegroundColor Yellow
        exit 1
    }
    
    # Check WSL2 (recommended for Docker on Windows)
    try {
        $wslVersion = wsl --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ WSL2 detected - recommended for Docker performance" -ForegroundColor Green
        } else {
            Write-Host "⚠️  WSL2 not detected. Consider installing for better Docker performance." -ForegroundColor Yellow
            Write-Host "   Run: wsl --install" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  WSL2 not available. Docker will use Hyper-V backend." -ForegroundColor Yellow
    }
    
    # Check available disk space (need at least 50GB for models)
    $drive = Get-PSDrive -Name C
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    $requiredSpaceGB = 50
    
    if ($freeSpaceGB -lt $requiredSpaceGB) {
        Write-Host "❌ Insufficient disk space. Need at least ${requiredSpaceGB}GB, have ${freeSpaceGB}GB" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ Disk space check passed: ${freeSpaceGB}GB available" -ForegroundColor Green
    }
    
    Write-Host "✅ All dependencies check passed" -ForegroundColor Green
}

# Create necessary directories
function Setup-Directories {
    Write-Host "📁 Creating directories..." -ForegroundColor Yellow
    
    $directories = @("models", "voice_models", "uploads", "docker\xtts")
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "   Created: $dir" -ForegroundColor Gray
        } else {
            Write-Host "   Exists: $dir" -ForegroundColor Gray
        }
    }
    
    Write-Host "✅ Directories created" -ForegroundColor Green
}

# Setup environment
function Setup-Environment {
    Write-Host "⚙️ Setting up environment..." -ForegroundColor Yellow
    
    # Copy environment template if .env doesn't exist
    if (!(Test-Path ".env")) {
        if (Test-Path ".env.selfhosted.template") {
            Copy-Item ".env.selfhosted.template" ".env"
            Write-Host "📝 Created .env file from template." -ForegroundColor Green
            Write-Host "   Please edit .env with your specific settings." -ForegroundColor Yellow
        } else {
            Write-Host "❌ .env.selfhosted.template not found!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "📝 .env file already exists" -ForegroundColor Green
    }
    
    # Generate secure password if needed
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "your_secure_postgres_password") {
        # Generate a secure password
        $bytes = New-Object Byte[] 32
        [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
        $password = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
        
        $envContent = $envContent -replace "your_secure_postgres_password", $password
        Set-Content ".env" $envContent
        Write-Host "🔑 Generated secure PostgreSQL password" -ForegroundColor Green
    }
    
    Write-Host "✅ Environment setup complete" -ForegroundColor Green
}

# Create XTTS Dockerfile and server script
function Create-XTTSFiles {
    Write-Host "🐳 Creating XTTS Docker setup..." -ForegroundColor Yellow
    
    # Create XTTS Dockerfile
    $dockerfileContent = @'
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch with CUDA support
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install XTTS
RUN pip install TTS flask

# Create app directory
WORKDIR /app

# Copy application files
COPY xtts_server.py .

# Expose port
EXPOSE 8020

# Run the server
CMD ["python", "xtts_server.py"]
'@
    
    Set-Content "docker\xtts\Dockerfile" $dockerfileContent
    
    # Create XTTS server script
    $serverContent = @'
from flask import Flask, request, Response
import torch
from TTS.api import TTS
import io
import numpy as np
from scipy.io.wavfile import write
import os

app = Flask(__name__)

# Initialize TTS
print("Initializing XTTS...")
device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print(f"XTTS initialized on {device}")

@app.route('/tts', methods=['POST'])
def synthesize():
    try:
        data = request.get_json()
        text = data.get('text', '')
        voice = data.get('voice', 'default')
        
        if not text:
            return {'error': 'No text provided'}, 400
        
        # Generate speech
        wav = tts.tts(text=text, language="en")
        
        # Convert to bytes
        buffer = io.BytesIO()
        write(buffer, 22050, np.array(wav))
        buffer.seek(0)
        
        return Response(buffer.getvalue(), mimetype='audio/wav')
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'device': 'cuda' if torch.cuda.is_available() else 'cpu'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8020, debug=False)
'@
    
    Set-Content "docker\xtts\xtts_server.py" $serverContent
    
    Write-Host "✅ XTTS Docker setup complete" -ForegroundColor Green
}

# Create Windows batch files for easy management
function Create-WindowsScripts {
    Write-Host "📝 Creating Windows management scripts..." -ForegroundColor Yellow
    
    # Start script
    $startScript = @'
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
'@
    Set-Content "start-zyglio.bat" $startScript
    
    # Stop script
    $stopScript = @'
@echo off
echo Stopping Zyglio self-hosted services...
docker-compose down
echo Services stopped
pause
'@
    Set-Content "stop-zyglio.bat" $stopScript
    
    # Status script
    $statusScript = @'
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
'@
    Set-Content "status-zyglio.bat" $statusScript
    
    Write-Host "✅ Created Windows batch scripts:" -ForegroundColor Green
    Write-Host "   - start-zyglio.bat" -ForegroundColor Gray
    Write-Host "   - stop-zyglio.bat" -ForegroundColor Gray
    Write-Host "   - status-zyglio.bat" -ForegroundColor Gray
}

# Test Docker Compose configuration
function Test-Configuration {
    Write-Host "🧪 Testing Docker Compose configuration..." -ForegroundColor Yellow
    
    try {
        $configTest = docker-compose config 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker Compose configuration is valid" -ForegroundColor Green
        } else {
            Write-Host "❌ Docker Compose configuration error:" -ForegroundColor Red
            Write-Host $configTest -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Failed to test Docker Compose configuration" -ForegroundColor Red
        exit 1
    }
}

# Main setup function
function Main {
    Write-Host "🎯 Starting Zyglio self-hosting setup for Windows..." -ForegroundColor Cyan
    Write-Host ""
    
    if (!$SkipChecks) {
        Check-Dependencies
        Write-Host ""
    }
    
    Setup-Directories
    Write-Host ""
    
    Create-XTTSFiles
    Write-Host ""
    
    Setup-Environment
    Write-Host ""
    
    Create-WindowsScripts
    Write-Host ""
    
    Test-Configuration
    Write-Host ""
    
    Write-Host "✅ Windows setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Edit .env file with your specific settings" -ForegroundColor White
    Write-Host "2. Run .\scripts\download-models.ps1 to download AI models" -ForegroundColor White
    Write-Host "3. Start services with: .\start-zyglio.bat" -ForegroundColor White
    Write-Host "4. Visit http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "🎮 Management commands:" -ForegroundColor Cyan
    Write-Host "   Start:  .\start-zyglio.bat" -ForegroundColor White
    Write-Host "   Stop:   .\stop-zyglio.bat" -ForegroundColor White  
    Write-Host "   Status: .\status-zyglio.bat" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 For more information, see SELF_HOSTING.md" -ForegroundColor Yellow
}

# Run main function
Main 
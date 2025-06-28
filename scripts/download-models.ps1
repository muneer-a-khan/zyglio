# Model Download Script for Zyglio Self-Hosting (Windows PowerShell)
# This script downloads all necessary AI models for local deployment

param(
    [switch]$SkipPrompts,
    [string]$LLMChoice = "",
    [string]$WhisperChoice = ""
)

Write-Host "📥 Downloading AI models for Zyglio self-hosting..." -ForegroundColor Cyan

# Check for required tools
function Check-Tools {
    Write-Host "🔧 Checking required tools..." -ForegroundColor Yellow
    
    # Check for git
    try {
        $gitVersion = git --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Git detected: $gitVersion" -ForegroundColor Green
        } else {
            throw "Git not found"
        }
    } catch {
        Write-Host "❌ Git is required but not installed" -ForegroundColor Red
        Write-Host "   Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
    
    # Check for Python and pip
    try {
        $pythonVersion = python --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Python detected: $pythonVersion" -ForegroundColor Green
        } else {
            throw "Python not found"
        }
    } catch {
        Write-Host "❌ Python is required but not installed" -ForegroundColor Red
        Write-Host "   Download from: https://python.org/downloads/" -ForegroundColor Yellow
        exit 1
    }
    
    # Check for huggingface-hub
    try {
        $hfVersion = python -m pip show huggingface-hub 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Hugging Face Hub detected" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Installing huggingface-hub..." -ForegroundColor Yellow
            python -m pip install "huggingface_hub[cli]"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Hugging Face Hub installed" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to install huggingface-hub" -ForegroundColor Red
                exit 1
            }
        }
    } catch {
        Write-Host "❌ Failed to check for huggingface-hub" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Tools check passed" -ForegroundColor Green
}

# Create directories
function Setup-Directories {
    Write-Host "📁 Creating model directories..." -ForegroundColor Yellow
    
    $directories = @("models", "voice_models\xtts", "voice_models\whisper")
    
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

# Download LLM models
function Download-LLMModels {
    Write-Host "🤖 Downloading LLM models..." -ForegroundColor Yellow
    
    if ($LLMChoice -eq "" -and !$SkipPrompts) {
        Write-Host ""
        Write-Host "Select LLM model to download:" -ForegroundColor Cyan
        Write-Host "1) Mistral 7B Instruct (Recommended - ~13GB)" -ForegroundColor White
        Write-Host "2) Llama 2 7B Chat (~13GB)" -ForegroundColor White
        Write-Host "3) CodeLlama 7B Instruct (~13GB)" -ForegroundColor White
        Write-Host "4) Skip LLM download (manual setup)" -ForegroundColor White
        Write-Host ""
        
        do {
            $LLMChoice = Read-Host "Enter choice (1-4)"
        } while ($LLMChoice -notmatch '^[1-4]$')
    }
    
    switch ($LLMChoice) {
        "1" {
            Write-Host "📥 Downloading Mistral 7B Instruct..." -ForegroundColor Yellow
            python -m huggingface_hub download mistralai/Mistral-7B-Instruct-v0.3 --local-dir models/mistral-7b-instruct --local-dir-use-symlinks False
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Mistral 7B Instruct downloaded successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to download Mistral 7B Instruct" -ForegroundColor Red
            }
        }
        "2" {
            Write-Host "📥 Downloading Llama 2 7B Chat..." -ForegroundColor Yellow
            Write-Host "⚠️  Note: You may need to accept Meta's license on Hugging Face first" -ForegroundColor Yellow
            python -m huggingface_hub download meta-llama/Llama-2-7b-chat-hf --local-dir models/llama-2-7b-chat --local-dir-use-symlinks False
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Llama 2 7B Chat downloaded successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to download Llama 2 7B Chat" -ForegroundColor Red
                Write-Host "   You may need to accept the license at: https://huggingface.co/meta-llama/Llama-2-7b-chat-hf" -ForegroundColor Yellow
            }
        }
        "3" {
            Write-Host "📥 Downloading CodeLlama 7B Instruct..." -ForegroundColor Yellow
            python -m huggingface_hub download codellama/CodeLlama-7b-Instruct-hf --local-dir models/codellama-7b-instruct --local-dir-use-symlinks False
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ CodeLlama 7B Instruct downloaded successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to download CodeLlama 7B Instruct" -ForegroundColor Red
            }
        }
        "4" {
            Write-Host "⏭️  Skipping LLM download. You'll need to manually place models in models/ directory" -ForegroundColor Yellow
        }
        default {
            Write-Host "❌ Invalid choice. Skipping LLM download." -ForegroundColor Red
        }
    }
}

# Download Whisper models
function Download-WhisperModels {
    Write-Host "🎙️ Downloading Whisper models..." -ForegroundColor Yellow
    
    if ($WhisperChoice -eq "" -and !$SkipPrompts) {
        Write-Host ""
        Write-Host "Select Whisper model size:" -ForegroundColor Cyan
        Write-Host "1) Base (Recommended - ~142MB, good balance of speed/quality)" -ForegroundColor White
        Write-Host "2) Small (~244MB, better quality)" -ForegroundColor White
        Write-Host "3) Medium (~769MB, even better quality)" -ForegroundColor White
        Write-Host "4) Large (~1550MB, best quality)" -ForegroundColor White
        Write-Host "5) Download all sizes" -ForegroundColor White
        Write-Host ""
        
        do {
            $WhisperChoice = Read-Host "Enter choice (1-5)"
        } while ($WhisperChoice -notmatch '^[1-5]$')
    }
    
    function Download-WhisperModel($size) {
        $url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${size}.en.bin"
        $filename = "voice_models\whisper\ggml-${size}.en.bin"
        
        Write-Host "📥 Downloading Whisper ${size} model..." -ForegroundColor Yellow
        
        try {
            # Use .NET WebClient for reliable downloads on Windows
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($url, $filename)
            Write-Host "✅ Whisper ${size} model downloaded successfully" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to download Whisper ${size} model: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    switch ($WhisperChoice) {
        "1" { Download-WhisperModel "base" }
        "2" { Download-WhisperModel "small" }
        "3" { Download-WhisperModel "medium" }
        "4" { Download-WhisperModel "large" }
        "5" {
            Download-WhisperModel "base"
            Download-WhisperModel "small"
            Download-WhisperModel "medium"
            Download-WhisperModel "large"
        }
        default {
            Write-Host "❌ Invalid choice. Downloading base model as default." -ForegroundColor Yellow
            Download-WhisperModel "base"
        }
    }
}

# Setup TTS models
function Setup-TTSModels {
    Write-Host "🔊 Setting up TTS models..." -ForegroundColor Yellow
    
    # XTTS models will be downloaded automatically on first run
    # But we can prepare the directory structure
    if (!(Test-Path "voice_models\xtts")) {
        New-Item -ItemType Directory -Path "voice_models\xtts" -Force | Out-Null
    }
    
    Write-Host "📝 TTS models will be downloaded automatically on first use." -ForegroundColor Gray
    Write-Host "   This includes XTTS v2 models (~2GB) which will be cached locally." -ForegroundColor Gray
    
    # Create a sample speaker voice file placeholder
    Write-Host "🎵 To use custom voices, place speaker audio files (.wav) in voice_models\xtts\speakers\" -ForegroundColor Gray
    if (!(Test-Path "voice_models\xtts\speakers")) {
        New-Item -ItemType Directory -Path "voice_models\xtts\speakers" -Force | Out-Null
    }
    
    Write-Host "✅ TTS setup complete" -ForegroundColor Green
}

# Verify downloads
function Verify-Downloads {
    Write-Host "✅ Verifying downloads..." -ForegroundColor Yellow
    
    # Check LLM models
    $llmModels = Get-ChildItem -Path "models" -Directory -ErrorAction SilentlyContinue
    if ($llmModels) {
        foreach ($model in $llmModels) {
            $size = Get-ChildItem -Path $model.FullName -Recurse | Measure-Object -Property Length -Sum
            $sizeGB = [math]::Round($size.Sum / 1GB, 2)
            Write-Host "📊 LLM model '$($model.Name)': ${sizeGB} GB" -ForegroundColor Gray
        }
    } else {
        Write-Host "📊 No LLM models found" -ForegroundColor Gray
    }
    
    # Check Whisper models
    $whisperModels = Get-ChildItem -Path "voice_models\whisper" -File -ErrorAction SilentlyContinue
    if ($whisperModels) {
        foreach ($model in $whisperModels) {
            $sizeMB = [math]::Round($model.Length / 1MB, 1)
            Write-Host "📊 Whisper model '$($model.Name)': ${sizeMB} MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "📊 No Whisper models found" -ForegroundColor Gray
    }
    
    # Check TTS setup
    if (Test-Path "voice_models\xtts") {
        Write-Host "📊 TTS: Ready for automatic download" -ForegroundColor Gray
    }
    
    Write-Host "✅ Download verification complete" -ForegroundColor Green
}

# Create model configuration
function Create-ModelConfig {
    Write-Host "⚙️ Creating model configuration..." -ForegroundColor Yellow
    
    $config = @{
        llm = @{
            available_models = @()
            default_model = "mistral-7b-instruct"
            model_paths = @{}
        }
        whisper = @{
            available_sizes = @()
            default_size = "base"
            model_paths = @{}
        }
        tts = @{
            engine = "xtts"
            voice_path = "voice_models/xtts/speakers/"
            default_voice = "default"
        }
    }
    
    # Update config with actual downloaded models
    $llmModels = Get-ChildItem -Path "models" -Directory -ErrorAction SilentlyContinue
    if ($llmModels) {
        foreach ($model in $llmModels) {
            $config.llm.available_models += $model.Name
            $config.llm.model_paths[$model.Name] = "models/$($model.Name)"
            Write-Host "✅ Found LLM model: $($model.Name)" -ForegroundColor Green
        }
    }
    
    # Check Whisper models
    $whisperSizes = @("base", "small", "medium", "large")
    foreach ($size in $whisperSizes) {
        if (Test-Path "voice_models\whisper\ggml-${size}.en.bin") {
            $config.whisper.available_sizes += $size
            $config.whisper.model_paths[$size] = "voice_models/whisper/ggml-${size}.en.bin"
            Write-Host "✅ Found Whisper ${size} model" -ForegroundColor Green
        }
    }
    
    # Save configuration
    $configJson = $config | ConvertTo-Json -Depth 3
    Set-Content "models\model_config.json" $configJson
    
    Write-Host "📝 Model configuration created" -ForegroundColor Green
}

# Main function
function Main {
    Write-Host "🎯 Starting model download process for Windows..." -ForegroundColor Cyan
    Write-Host ""
    
    Check-Tools
    Setup-Directories
    
    if (!$SkipPrompts) {
        Write-Host ""
        Write-Host "🚀 Ready to download models. This may take a while and use significant bandwidth." -ForegroundColor Yellow
        Write-Host "💾 Total download size may be 15-30GB depending on your choices." -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Continue? (y/N)"
        
        if ($confirm -notmatch '^[Yy]$') {
            Write-Host "❌ Download cancelled. You can run this script again anytime." -ForegroundColor Yellow
            exit 0
        }
    }
    
    Write-Host ""
    Download-LLMModels
    Write-Host ""
    Download-WhisperModels
    Write-Host ""
    Setup-TTSModels
    Write-Host ""
    Verify-Downloads
    Create-ModelConfig
    
    Write-Host ""
    Write-Host "✅ Model download complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy this entire directory to your 4090 machine" -ForegroundColor White
    Write-Host "2. Run: docker-compose up -d" -ForegroundColor White
    Write-Host "3. Your models will be ready for local AI processing" -ForegroundColor White
    Write-Host ""
    Write-Host "📍 Model locations:" -ForegroundColor Cyan
    Write-Host "   - LLM models: models\" -ForegroundColor White
    Write-Host "   - Whisper: voice_models\whisper\" -ForegroundColor White
    Write-Host "   - TTS setup: voice_models\xtts\" -ForegroundColor White
    Write-Host ""
    Write-Host "🎮 To start Zyglio services: .\start-zyglio.bat" -ForegroundColor Green
}

# Run main function
Main 
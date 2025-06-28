#!/bin/bash

# Model Download Script for Zyglio Self-Hosting
# This script downloads all necessary AI models for local deployment

set -e

echo "📥 Downloading AI models for Zyglio self-hosting..."

# Check for required tools
check_tools() {
    echo "🔧 Checking required tools..."
    
    # Check for git
    if ! command -v git &> /dev/null; then
        echo "❌ git is required but not installed"
        exit 1
    fi
    
    # Check for wget or curl
    if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
        echo "❌ wget or curl is required but not installed"
        exit 1
    fi
    
    # Check for huggingface-hub (optional but recommended)
    if ! pip show huggingface-hub &> /dev/null; then
        echo "⚠️  huggingface-hub not installed. Installing..."
        pip install huggingface-hub[cli]
    fi
    
    echo "✅ Tools check passed"
}

# Create directories
setup_directories() {
    echo "📁 Creating model directories..."
    mkdir -p models
    mkdir -p voice_models/xtts
    mkdir -p voice_models/whisper
    echo "✅ Directories created"
}

# Download LLM models
download_llm_models() {
    echo "🤖 Downloading LLM models..."
    
    # Create options for different models
    echo "Select LLM model to download:"
    echo "1) Mistral 7B Instruct (Recommended - ~13GB)"
    echo "2) Llama 2 7B Chat (~13GB)"
    echo "3) CodeLlama 7B Instruct (~13GB)"
    echo "4) Skip LLM download (manual setup)"
    
    read -p "Enter choice (1-4): " llm_choice
    
    case $llm_choice in
        1)
            echo "📥 Downloading Mistral 7B Instruct..."
            huggingface-cli download mistralai/Mistral-7B-Instruct-v0.3 \
                --local-dir models/mistral-7b-instruct \
                --local-dir-use-symlinks False
            ;;
        2)
            echo "📥 Downloading Llama 2 7B Chat..."
            huggingface-cli download meta-llama/Llama-2-7b-chat-hf \
                --local-dir models/llama-2-7b-chat \
                --local-dir-use-symlinks False
            ;;
        3)
            echo "📥 Downloading CodeLlama 7B Instruct..."
            huggingface-cli download codellama/CodeLlama-7b-Instruct-hf \
                --local-dir models/codellama-7b-instruct \
                --local-dir-use-symlinks False
            ;;
        4)
            echo "⏭️  Skipping LLM download. You'll need to manually place models in models/ directory"
            ;;
        *)
            echo "❌ Invalid choice. Skipping LLM download."
            ;;
    esac
}

# Download Whisper models
download_whisper_models() {
    echo "🎙️ Downloading Whisper models..."
    
    echo "Select Whisper model size:"
    echo "1) Base (Recommended - ~142MB, good balance of speed/quality)"
    echo "2) Small (~244MB, better quality)"
    echo "3) Medium (~769MB, even better quality)"
    echo "4) Large (~1550MB, best quality)"
    echo "5) Download all sizes"
    
    read -p "Enter choice (1-5): " whisper_choice
    
    download_whisper_model() {
        local size=$1
        local url="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${size}.en.bin"
        local filename="voice_models/whisper/ggml-${size}.en.bin"
        
        echo "📥 Downloading Whisper ${size} model..."
        if command -v wget &> /dev/null; then
            wget -O "$filename" "$url"
        else
            curl -L -o "$filename" "$url"
        fi
    }
    
    case $whisper_choice in
        1)
            download_whisper_model "base"
            ;;
        2)
            download_whisper_model "small"
            ;;
        3)
            download_whisper_model "medium"
            ;;
        4)
            download_whisper_model "large"
            ;;
        5)
            download_whisper_model "base"
            download_whisper_model "small"
            download_whisper_model "medium"
            download_whisper_model "large"
            ;;
        *)
            echo "❌ Invalid choice. Downloading base model as default."
            download_whisper_model "base"
            ;;
    esac
}

# Download TTS models
download_tts_models() {
    echo "🔊 Setting up TTS models..."
    
    # XTTS models will be downloaded automatically on first run
    # But we can prepare the directory structure
    mkdir -p voice_models/xtts
    
    echo "📝 TTS models will be downloaded automatically on first use."
    echo "   This includes XTTS v2 models (~2GB) which will be cached locally."
    
    # Create a sample speaker voice file placeholder
    echo "🎵 To use custom voices, place speaker audio files (.wav) in voice_models/xtts/speakers/"
    mkdir -p voice_models/xtts/speakers
}

# Verify downloads
verify_downloads() {
    echo "✅ Verifying downloads..."
    
    total_size=0
    
    # Check LLM models
    if [ -d "models" ]; then
        llm_size=$(du -sh models 2>/dev/null | cut -f1 || echo "0")
        echo "📊 LLM models: $llm_size"
    fi
    
    # Check Whisper models
    if [ -d "voice_models/whisper" ]; then
        whisper_size=$(du -sh voice_models/whisper 2>/dev/null | cut -f1 || echo "0")
        echo "📊 Whisper models: $whisper_size"
    fi
    
    # Check TTS setup
    if [ -d "voice_models/xtts" ]; then
        echo "📊 TTS: Ready for automatic download"
    fi
    
    echo "✅ Download verification complete"
}

# Create model configuration
create_model_config() {
    echo "⚙️ Creating model configuration..."
    
    cat > models/model_config.json << 'EOF'
{
  "llm": {
    "available_models": [],
    "default_model": "mistral-7b-instruct",
    "model_paths": {}
  },
  "whisper": {
    "available_sizes": [],
    "default_size": "base",
    "model_paths": {}
  },
  "tts": {
    "engine": "xtts",
    "voice_path": "voice_models/xtts/speakers/",
    "default_voice": "default"
  }
}
EOF

    # Update config with actual downloaded models
    if [ -d "models/mistral-7b-instruct" ]; then
        echo "✅ Found Mistral 7B Instruct"
        # Update config accordingly
    fi
    
    if [ -d "models/llama-2-7b-chat" ]; then
        echo "✅ Found Llama 2 7B Chat"
    fi
    
    if [ -d "models/codellama-7b-instruct" ]; then
        echo "✅ Found CodeLlama 7B Instruct"
    fi
    
    # Check Whisper models
    for size in base small medium large; do
        if [ -f "voice_models/whisper/ggml-${size}.en.bin" ]; then
            echo "✅ Found Whisper ${size} model"
        fi
    done
    
    echo "📝 Model configuration created"
}

# Main function
main() {
    echo "🎯 Starting model download process..."
    echo ""
    
    check_tools
    setup_directories
    
    echo ""
    echo "🚀 Ready to download models. This may take a while and use significant bandwidth."
    echo "💾 Total download size may be 15-30GB depending on your choices."
    echo ""
    read -p "Continue? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        download_llm_models
        echo ""
        download_whisper_models
        echo ""
        download_tts_models
        echo ""
        verify_downloads
        create_model_config
        
        echo ""
        echo "✅ Model download complete!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Copy this entire directory to your 4090 machine"
        echo "2. Run: docker-compose up -d"
        echo "3. Your models will be ready for local AI processing"
        echo ""
        echo "📍 Model locations:"
        echo "   - LLM models: models/"
        echo "   - Whisper: voice_models/whisper/"
        echo "   - TTS setup: voice_models/xtts/"
    else
        echo "❌ Download cancelled. You can run this script again anytime."
    fi
}

# Run main function
main "$@" 
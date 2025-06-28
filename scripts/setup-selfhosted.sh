#!/bin/bash

# Zyglio Self-Hosting Setup Script
# This script prepares everything needed for local AI hosting

set -e

echo "🚀 Setting up Zyglio for self-hosting..."

# Check for required dependencies
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required but not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check NVIDIA Docker runtime
    if ! docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi &> /dev/null; then
        echo "⚠️  NVIDIA Docker runtime not detected. GPU acceleration may not work."
        echo "   Please install nvidia-container-toolkit for GPU support."
    else
        echo "✅ NVIDIA Docker runtime detected"
    fi
    
    # Check available disk space (need at least 50GB for models)
    available_space=$(df . | awk 'NR==2 {print $4}')
    required_space=52428800  # 50GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        echo "❌ Insufficient disk space. Need at least 50GB, have $(($available_space/1024/1024))GB"
        exit 1
    fi
    
    echo "✅ All dependencies check passed"
}

# Create necessary directories
setup_directories() {
    echo "📁 Creating directories..."
    mkdir -p models
    mkdir -p voice_models
    mkdir -p uploads
    mkdir -p docker/xtts
    echo "✅ Directories created"
}

# Download AI models
download_models() {
    echo "📥 Downloading AI models (this may take a while)..."
    
    # Create models directory if it doesn't exist
    mkdir -p models
    
    # Download Mistral 7B Instruct model (or provide instructions)
    echo "🤖 Setting up LLM model..."
    if [ ! -d "models/mistral-7b-instruct" ]; then
        echo "📥 Downloading Mistral 7B Instruct model..."
        # Note: You'll need to replace this with actual model download
        # This is a placeholder - actual implementation would use huggingface-hub
        echo "⚠️  Please download Mistral 7B Instruct model manually:"
        echo "   huggingface-cli download microsoft/DialoGPT-medium --local-dir models/mistral-7b-instruct"
        echo "   Or use your preferred model compatible with vLLM"
    fi
    
    # Download Whisper models
    echo "🎙️  Setting up Whisper models..."
    if [ ! -f "models/ggml-base.en.bin" ]; then
        echo "📥 Downloading Whisper base model..."
        wget -O models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
    fi
    
    # Setup XTTS models
    echo "🔊 Setting up TTS models..."
    mkdir -p voice_models/xtts
    # XTTS models will be downloaded on first run
    
    echo "✅ Model setup complete"
}

# Create XTTS Dockerfile
create_xtts_dockerfile() {
    echo "🐳 Creating XTTS Dockerfile..."
    
    cat > docker/xtts/Dockerfile << 'EOF'
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
RUN pip install TTS

# Create app directory
WORKDIR /app

# Copy application files
COPY xtts_server.py .

# Expose port
EXPOSE 8020

# Run the server
CMD ["python", "xtts_server.py"]
EOF

    # Create XTTS server script
    cat > docker/xtts/xtts_server.py << 'EOF'
from flask import Flask, request, Response
import torch
from TTS.api import TTS
import io
import numpy as np
from scipy.io.wavfile import write

app = Flask(__name__)

# Initialize TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda" if torch.cuda.is_available() else "cpu")

@app.route('/tts', methods=['POST'])
def synthesize():
    data = request.get_json()
    text = data.get('text', '')
    voice = data.get('voice', 'default')
    
    # Generate speech
    wav = tts.tts(text=text, speaker_wav="/app/models/speaker.wav", language="en")
    
    # Convert to bytes
    buffer = io.BytesIO()
    write(buffer, 22050, np.array(wav))
    buffer.seek(0)
    
    return Response(buffer.getvalue(), mimetype='audio/wav')

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8020)
EOF

    echo "✅ XTTS Docker setup complete"
}

# Setup environment
setup_environment() {
    echo "⚙️  Setting up environment..."
    
    # Copy environment template if .env doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.selfhosted.template .env
        echo "📝 Created .env file from template. Please edit it with your settings."
    fi
    
    # Generate secure passwords
    if ! grep -q "your_secure_postgres_password" .env; then
        postgres_password=$(openssl rand -base64 32)
        sed -i "s/your_secure_postgres_password/$postgres_password/g" .env
        echo "🔑 Generated secure PostgreSQL password"
    fi
    
    echo "✅ Environment setup complete"
}

# Setup systemd services (optional)
setup_systemd() {
    echo "⚙️  Setting up systemd service (optional)..."
    
    cat > zyglio.service << 'EOF'
[Unit]
Description=Zyglio Self-Hosted Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/zyglio
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    echo "📝 Created zyglio.service file. To install:"
    echo "   sudo cp zyglio.service /etc/systemd/system/"
    echo "   sudo systemctl enable zyglio"
    echo "   sudo systemctl start zyglio"
}

# Main setup function
main() {
    echo "🎯 Starting Zyglio self-hosting setup..."
    
    check_dependencies
    setup_directories
    download_models
    create_xtts_dockerfile
    setup_environment
    setup_systemd
    
    echo ""
    echo "✅ Setup complete! Next steps:"
    echo ""
    echo "1. Edit .env file with your specific settings"
    echo "2. Ensure your AI models are properly downloaded"
    echo "3. Run: docker-compose up -d"
    echo "4. Visit http://localhost:3000"
    echo ""
    echo "📚 For more information, see SELF_HOSTING.md"
}

# Run main function
main "$@" 
# 🚀 Deploy Zyglio to Your 4090 Machine

This guide will get your Zyglio platform running on your 4090 machine with local AI processing.

## 📦 Transfer Files to 4090 Machine

1. **Copy your entire project** to the 4090 machine
2. **Copy the environment file**:
   ```bash
   # On 4090 machine, in the project directory:
   cp .env.4090-ready .env
   ```

## 🐳 Install Docker with GPU Support

### Windows (Recommended):
```powershell
# 1. Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop/

# 2. Install NVIDIA Container Toolkit
# Follow: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
```

### Linux:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

## 🚀 Deploy Zyglio

### Option 1: Quick Start (Hybrid Mode)
```powershell
# Start core services first
docker-compose up -d redis

# Start your application (uses local AI + external fallback)
docker-compose up -d zyglio

# Check status
.\status-zyglio.bat
```

### Option 2: Full Self-Hosting
```powershell
# Download AI models first (this will take ~30-60 minutes)
.\scripts\download-models.ps1

# Start all services
docker-compose up -d

# Check status
.\status-zyglio.bat
```

## 🔍 Verify Deployment

1. **Check services**:
   ```powershell
   .\status-zyglio.bat
   ```

2. **Access your application**:
   - Open: http://localhost:3000
   - Your existing account and data will work immediately

3. **Test AI services**:
   ```powershell
   # Test local LLM (if running)
   curl http://localhost:8000/health
   
   # Test Whisper (if running)  
   curl http://localhost:9000/health
   
   # Test TTS (if running)
   curl http://localhost:8020/health
   ```

## 📊 Monitor Performance

### GPU Usage:
```powershell
nvidia-smi
```

### Container Status:
```powershell
docker-compose ps
docker-compose logs zyglio
```

### Resource Usage:
```powershell
docker stats
```

## 🔄 Configuration Modes

Your `.env` file is set to **HYBRID** mode by default. You can change it:

### Hybrid Mode (Recommended):
```bash
AI_PROVIDER="hybrid"
```
- Uses local AI when available
- Falls back to your external APIs
- Best reliability

### Local Only Mode:
```bash
AI_PROVIDER="local"  
```
- Uses only local AI
- Maximum privacy
- Requires all services running

### External Only Mode:
```bash
AI_PROVIDER="external"
```
- Uses only external APIs
- Same as your current setup
- No local AI needed

## 🛠️ Troubleshooting

### If services fail to start:
```powershell
# Check logs
docker-compose logs

# Restart specific service
docker-compose restart zyglio

# Full restart
docker-compose down
docker-compose up -d
```

### If GPU not detected:
```powershell
# Verify NVIDIA drivers
nvidia-smi

# Verify Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
```

### If models fail to download:
```powershell
# Manual model download
.\scripts\download-models.ps1 -Verbose

# Check disk space (models need ~30GB)
Get-PSDrive C
```

## 📈 Performance Expectations

### RTX 4090 Performance:
- **Text Generation**: ~50-100 tokens/second
- **Voice Transcription**: Real-time or faster
- **Text-to-Speech**: ~2-5x real-time
- **Training Module Generation**: ~5-10 seconds
- **Quiz Generation**: ~3-5 seconds

### Memory Usage:
- **LLM**: ~8-12GB VRAM
- **Whisper**: ~1-2GB VRAM  
- **TTS**: ~2-4GB VRAM
- **Total**: ~12-18GB VRAM (4090 has 24GB)

## 🎯 Next Steps

1. **Test with existing data** - Your current training modules and user data will work immediately
2. **Monitor performance** - Compare local vs external API speed and quality
3. **Optimize settings** - Adjust GPU memory usage based on your needs
4. **Consider full migration** - Move database locally when ready

## 📞 Support

If you encounter issues:
1. Check `.\status-zyglio.bat` for service health
2. View logs: `docker-compose logs zyglio`
3. Verify GPU access: `nvidia-smi`
4. Check disk space for models

---

> **🎉 Ready to Go!** Your self-hosted Zyglio platform is configured and ready to deploy. The hybrid mode ensures you'll have a smooth transition with all your existing functionality preserved. 
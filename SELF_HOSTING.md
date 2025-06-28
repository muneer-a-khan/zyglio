# Zyglio Self-Hosting Guide

This guide will help you set up Zyglio for complete self-hosting with local AI services, eliminating the need for external API dependencies.

## 🎯 Overview

Zyglio can be fully self-hosted using:
- **Local LLM**: vLLM with Mistral 7B (or your preferred model)
- **Local Speech-to-Text**: Whisper
- **Local Text-to-Speech**: XTTS
- **Local Database**: PostgreSQL with pgvector
- **Local Storage**: File system storage

## 📋 Requirements

### Hardware Requirements
- **GPU**: NVIDIA RTX 4070 Ti / 4080 / 4090 (minimum 12GB VRAM recommended)
- **RAM**: 32GB+ system RAM
- **Storage**: 100GB+ free space for models and data
- **CPU**: Modern multi-core processor (8+ cores recommended)

### Software Requirements
- Docker & Docker Compose
- NVIDIA Container Toolkit
- Git
- Linux (Ubuntu 20.04+ recommended) or Windows with WSL2

## 🚀 What You Can Prepare NOW (Without 4090)

### 1. **Repository Setup**
```bash
# Clone and setup the infrastructure
git clone <your-repo>
cd zyglio
chmod +x scripts/setup-selfhosted.sh
./scripts/setup-selfhosted.sh
```

### 2. **Environment Configuration**
- ✅ Create `.env` file from template
- ✅ Configure database settings
- ✅ Set up Docker Compose files
- ✅ Prepare model directories

### 3. **Model Download Preparation**
Create model download scripts (these work on any machine):

```bash
# Create model download script
./scripts/download-models.sh
```

### 4. **Database Migration Preparation**
- ✅ Database schema is already ready
- ✅ pgvector extension setup prepared
- ✅ Vector similarity functions ready

### 5. **Application Configuration**
- ✅ AI adapter layer configured for local/remote switching
- ✅ Docker containers configured
- ✅ Fallback systems in place

## ⏰ What Needs the 4090 Hardware

### 1. **Model Loading & GPU Setup**
```bash
# Run this ON the 4090 machine
docker-compose up vllm whisper xtts
```

### 2. **Performance Optimization**
- GPU memory allocation tuning
- Model quantization settings
- Concurrent request handling

### 3. **Local AI Service Testing**
- Latency optimization
- Load testing
- Memory usage optimization

## 📁 Directory Structure (After Setup)

```
zyglio/
├── docker-compose.yml           # ✅ Ready now
├── Dockerfile                   # ✅ Ready now
├── .env.selfhosted.template     # ✅ Ready now
├── scripts/
│   ├── setup-selfhosted.sh     # ✅ Ready now
│   ├── download-models.sh      # ✅ Ready now
│   └── init-db.sql             # ✅ Ready now
├── models/                     # 📥 Download on 4090 machine
│   ├── mistral-7b-instruct/    # ~13GB
│   └── ggml-base.en.bin        # ~142MB
├── voice_models/               # 📥 Download on 4090 machine
│   └── xtts/                   # ~2GB
└── src/
    └── lib/
        └── ai-adapter.ts       # ✅ Ready now
```

## 🔄 Deployment Process

### Phase 1: Preparation (Do This Now)
```bash
# 1. Setup infrastructure
./scripts/setup-selfhosted.sh

# 2. Configure environment
cp .env.selfhosted.template .env
# Edit .env with your settings

# 3. Test configuration
docker-compose config
```

### Phase 2: On 4090 Machine
```bash
# 1. Transfer prepared files
rsync -av zyglio/ 4090-machine:/opt/zyglio/

# 2. Download models
cd /opt/zyglio
./scripts/download-models.sh

# 3. Start services
docker-compose up -d

# 4. Verify deployment
docker-compose ps
curl http://localhost:3000/api/health
```

## 🔧 Configuration Options

### AI Provider Modes
Set in `.env`:
```bash
# Use local services only
AI_PROVIDER="local"

# Use external APIs only  
AI_PROVIDER="external"

# Use local with external fallback
AI_PROVIDER="hybrid"
```

### GPU Memory Optimization
```bash
# Adjust based on your GPU memory
GPU_MEMORY_UTILIZATION="0.8"  # Use 80% of GPU memory
```

### Performance Tuning
```bash
# Concurrent request limits
MAX_CONCURRENT_REQUESTS="10"
LLM_CONTEXT_LENGTH="8192"
```

## 📊 Monitoring & Health Checks

### Service Health Endpoints
- **Main App**: `http://localhost:3000/api/health`
- **vLLM**: `http://localhost:8000/health`  
- **Whisper**: `http://localhost:9000/health`
- **XTTS**: `http://localhost:8020/health`

### Resource Monitoring
```bash
# GPU usage
nvidia-smi

# Container resources
docker stats

# Application logs
docker-compose logs -f zyglio
```

## 🔒 Security Considerations

### Network Security
- All services run on localhost by default
- Use reverse proxy (nginx) for external access
- Enable firewall with only necessary ports

### Data Security
- Local database with encrypted connections
- File storage with proper permissions
- No external API calls (unless fallback enabled)

## 🚨 Troubleshooting

### Common Issues

#### GPU Not Detected
```bash
# Check NVIDIA Docker runtime
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

#### Out of Memory Errors
```bash
# Reduce GPU memory utilization
# Edit docker-compose.yml
GPU_MEMORY_UTILIZATION="0.6"
```

#### Slow Model Loading
```bash
# Check model paths
ls -la models/
# Verify model format
file models/mistral-7b-instruct/*
```

## 📈 Performance Expectations

### Expected Latencies (RTX 4090)
- **Text Generation**: 50-100 tokens/second
- **Speech-to-Text**: Real-time (1x speed)
- **Text-to-Speech**: 2-3x real-time
- **Total Voice Interview Latency**: <2 seconds

### Resource Usage
- **GPU Memory**: 8-12GB (depending on model)
- **System RAM**: 16-24GB
- **Storage**: 50-100GB for models

## 🔄 Migration Path

### From External APIs to Self-Hosted
1. **Test Phase**: Run in `hybrid` mode
2. **Gradual Migration**: Switch services one by one
3. **Full Self-Hosted**: Switch to `local` mode
4. **Cleanup**: Remove external API keys

### Backup Strategy
- Database: Automated PostgreSQL backups
- Models: Version-controlled model storage
- Configuration: Git-tracked environment files

## 📚 Additional Resources

- [vLLM Documentation](https://docs.vllm.ai/)
- [Whisper Documentation](https://github.com/openai/whisper)
- [XTTS Documentation](https://docs.coqui.ai/)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)

## 🆘 Support

### Self-Hosting Issues
1. Check logs: `docker-compose logs`
2. Verify GPU access: `nvidia-smi`
3. Test individual services: `curl health endpoints`
4. Review resource usage: `docker stats`

### Performance Optimization
1. Monitor GPU utilization
2. Adjust batch sizes
3. Tune memory allocation
4. Consider model quantization

---

> **Ready to Deploy?** Everything in this guide marked with ✅ can be prepared immediately. Save time by setting up the infrastructure now, then simply transfer to your 4090 machine when ready! 
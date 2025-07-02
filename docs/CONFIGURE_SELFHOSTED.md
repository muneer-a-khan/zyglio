# Self-Hosted Environment Configuration Guide

This guide shows you how to configure your `.env` file for self-hosting while maintaining your existing external APIs as fallbacks.

## 🔄 Migration Strategy

You have three deployment options:

### Option 1: Full Self-Hosted (Recommended for 4090 machine)
Complete local AI processing with optional external fallbacks.

### Option 2: Hybrid Mode (Recommended for initial testing)
Local AI for some services, external for others.

### Option 3: External Only (Current setup)
Keep using external APIs (your current configuration).

## ⚙️ Environment Configuration

### Step 1: Copy Your Current Configuration
Your current `.env` file is perfectly set up for external APIs. For self-hosting, create a new `.env.local` file:

```bash
# Copy your existing configuration as a starting point
cp .env .env.local
```

### Step 2: Add Self-Hosting Variables
Add these variables to your `.env.local` file:

```bash
# Self-hosting mode configuration
SELF_HOSTED="true"
AI_PROVIDER="hybrid"  # Options: local, external, hybrid

# Local AI Services (when running on 4090 machine)
LOCAL_LLM_URL="http://localhost:8000/v1"
LOCAL_WHISPER_URL="http://localhost:9000"
LOCAL_TTS_URL="http://localhost:8020"

# Database Options
# Option A: Keep using Supabase (recommended for initial testing)
# DATABASE_URL="postgresql://postgres.mlmqseffiwnbuurkfvvd:****@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgresql://postgres.mlmqseffiwnbuurkfvvd:****@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Option B: Use local PostgreSQL (for complete self-hosting)
# DATABASE_URL="postgresql://zyglio:YOUR_SECURE_PASSWORD@localhost:5432/zyglio"
# DIRECT_URL="postgresql://zyglio:YOUR_SECURE_PASSWORD@localhost:5432/zyglio"

# Performance Settings
GPU_MEMORY_UTILIZATION="0.8"
MAX_CONCURRENT_REQUESTS="10"
LLM_CONTEXT_LENGTH="8192"
```

### Step 3: AI Provider Modes

#### Hybrid Mode (Recommended Start)
```bash
AI_PROVIDER="hybrid"
SELF_HOSTED="true"
```
- Tries local AI first
- Falls back to your existing external APIs
- Best for gradual migration

#### Local Only Mode (Full Self-Hosting)
```bash
AI_PROVIDER="local"
SELF_HOSTED="true"
```
- Uses only local AI services
- No external API calls
- Maximum privacy and cost savings

#### External Mode (Current Setup)
```bash
AI_PROVIDER="external"
SELF_HOSTED="false"
```
- Uses your current external APIs
- No local AI services needed
- Your current configuration

## 🚀 Quick Setup Commands

### For Testing on Current Machine (External APIs)
```powershell
# Use your existing .env file
docker-compose -f docker-compose.yml up zyglio postgres redis
```

### For 4090 Machine (Full Self-Hosting)
```powershell
# Copy your project to 4090 machine, then:
cp .env .env.local

# Edit .env.local to add:
# AI_PROVIDER="hybrid"
# SELF_HOSTED="true"

# Start all services
docker-compose up -d
```

## 📋 Configuration Checklist

### ✅ Current Setup (Keep Working)
- [x] DeepSeek API Key configured
- [x] OpenAI API Key configured  
- [x] ElevenLabs API Key configured
- [x] Supabase database connected
- [x] Authentication working

### 📦 For Self-Hosting (4090 Machine)
- [ ] Docker Desktop installed
- [ ] NVIDIA Container Toolkit installed
- [ ] AI models downloaded (~30GB)
- [ ] Local services configuration added
- [ ] GPU memory allocation configured

## 🔧 Advanced Configuration

### Database Migration Options

#### Option 1: Keep Supabase (Easiest)
```bash
# No changes needed - keep your current database URLs
# Advantage: No data migration required
# Note: Still uses external database service
```

#### Option 2: Migrate to Local PostgreSQL (Full Self-Hosting)
```bash
# 1. Backup your Supabase data
pg_dump "your_supabase_url" > backup.sql

# 2. Import to local PostgreSQL
psql "postgresql://zyglio:password@localhost:5432/zyglio" < backup.sql

# 3. Update .env.local with local database URLs
```

### Storage Options

#### Option 1: Keep Supabase Storage (Easiest)
```bash
# Keep existing Supabase configuration
# Files stored in Supabase cloud storage
```

#### Option 2: Local File Storage (Full Self-Hosting)
```bash
# Files stored locally in uploads/ directory
# Configured automatically in docker-compose.yml
```

## 🎯 Deployment Scenarios

### Scenario 1: Testing Self-Hosting Setup
```bash
# Use hybrid mode with existing database
AI_PROVIDER="hybrid"
DATABASE_URL="your_existing_supabase_url"
```

### Scenario 2: Production Self-Hosting
```bash
# Full local setup
AI_PROVIDER="local"
DATABASE_URL="postgresql://zyglio:password@localhost:5432/zyglio"
```

### Scenario 3: Gradual Migration
```bash
# Week 1: Test local LLM only
AI_PROVIDER="hybrid"

# Week 2: Add local voice services
# Week 3: Migrate database
# Week 4: Full self-hosting
```

## 💡 Pro Tips

1. **Start with Hybrid Mode** - Test local AI while keeping your existing database
2. **Keep External Keys** - Useful for fallback and comparison testing
3. **Monitor Resource Usage** - Watch GPU memory and CPU utilization
4. **Backup Before Migration** - Always backup your Supabase data first

## 📞 Support

If you encounter issues:
1. Check service health: `./status-zyglio.bat`
2. View logs: `docker-compose logs`
3. Test individual services: `curl http://localhost:8000/health`

---

> **Ready to Deploy?** Your current setup will continue working exactly as-is. Self-hosting is purely additive - you're not breaking anything by preparing it! 
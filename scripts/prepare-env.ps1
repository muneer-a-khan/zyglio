# Environment Preparation Script for Self-Hosting
# This script helps you create the proper .env file for your 4090 machine

param(
    [string]$Mode = "hybrid"  # Options: hybrid, local, external
)

Write-Host "🔧 Preparing Zyglio environment for self-hosting..." -ForegroundColor Cyan

# Check if current .env exists
if (!(Test-Path ".env")) {
    Write-Host "❌ No .env file found. Please ensure you're in the project root directory." -ForegroundColor Red
    exit 1
}

# Create backup of current .env
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item ".env" ".env.backup.$timestamp"
Write-Host "✅ Backed up current .env to .env.backup.$timestamp" -ForegroundColor Green

# Read current environment
$currentEnv = Get-Content ".env" -Raw

# Create self-hosted environment
$selfHostedEnv = @"
# Zyglio Self-Hosted Configuration
# Generated: $(Get-Date)
# Mode: $Mode

# ===========================================
# AI Provider Configuration
# ===========================================
SELF_HOSTED="true"
AI_PROVIDER="$Mode"

# ===========================================
# Local AI Services (4090 Machine)
# ===========================================
LOCAL_LLM_URL="http://localhost:8000/v1"
LOCAL_WHISPER_URL="http://localhost:9000"
LOCAL_TTS_URL="http://localhost:8020"

# Performance Settings
GPU_MEMORY_UTILIZATION="0.8"
MAX_CONCURRENT_REQUESTS="10"
LLM_CONTEXT_LENGTH="8192"

# ===========================================
# External API Keys (Fallback/Hybrid Mode)
# ===========================================
$currentEnv

# ===========================================
# Database Configuration
# ===========================================
"@

if ($Mode -eq "local") {
    $selfHostedEnv += @"

# Local PostgreSQL (Full Self-Hosting)
# TODO: Update password after setting up local database
# DATABASE_URL="postgresql://zyglio:YOUR_SECURE_PASSWORD@localhost:5432/zyglio"
# DIRECT_URL="postgresql://zyglio:YOUR_SECURE_PASSWORD@localhost:5432/zyglio"

# Uncomment above and comment below for full self-hosting
"@
}

if ($Mode -eq "hybrid" -or $Mode -eq "external") {
    # Keep existing database configuration for hybrid/external mode
    $selfHostedEnv += @"

# Using existing Supabase database (recommended for testing)
# Your current database configuration is included above
"@
}

$selfHostedEnv += @"


# ===========================================
# Redis Configuration
# ===========================================
REDIS_URL="redis://localhost:6379"

# ===========================================
# Application Configuration
# ===========================================
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="production"

# ===========================================
# Configuration Notes
# ===========================================
# 1. This configuration uses '$Mode' mode
# 2. Your existing API keys are preserved for fallback
# 3. Database: $(if ($Mode -eq "local") { "Ready for local PostgreSQL migration" } else { "Using existing Supabase" })
# 4. AI Services: $(if ($Mode -eq "local") { "Local only" } elseif ($Mode -eq "hybrid") { "Local with external fallback" } else { "External only" })
"@

# Write the new environment file
Set-Content ".env.selfhosted" $selfHostedEnv

Write-Host ""
Write-Host "✅ Self-hosted environment configuration created!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor Cyan
Write-Host "   .env.selfhosted    - New self-hosted configuration" -ForegroundColor White
Write-Host "   .env.backup.$timestamp - Backup of your current .env" -ForegroundColor White
Write-Host ""

switch ($Mode) {
    "hybrid" {
        Write-Host "🔄 Hybrid Mode Configuration:" -ForegroundColor Yellow
        Write-Host "   ✅ Uses local AI when available" -ForegroundColor Green
        Write-Host "   ✅ Falls back to your existing external APIs" -ForegroundColor Green  
        Write-Host "   ✅ Keeps your current Supabase database" -ForegroundColor Green
        Write-Host "   ⚡ Best for initial testing and gradual migration" -ForegroundColor Blue
    }
    "local" {
        Write-Host "🏠 Local Mode Configuration:" -ForegroundColor Yellow
        Write-Host "   ✅ Uses only local AI services" -ForegroundColor Green
        Write-Host "   ⚠️  Requires database migration for full self-hosting" -ForegroundColor Yellow
        Write-Host "   🔒 Maximum privacy and cost savings" -ForegroundColor Blue
    }
    "external" {
        Write-Host "☁️  External Mode Configuration:" -ForegroundColor Yellow
        Write-Host "   ✅ Uses your current external APIs" -ForegroundColor Green
        Write-Host "   ✅ No local AI services needed" -ForegroundColor Green
        Write-Host "   📡 Same as your current setup" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy .env.selfhosted to your 4090 machine" -ForegroundColor White
Write-Host "2. Rename it to .env on the 4090 machine" -ForegroundColor White
Write-Host "3. Install Docker Desktop with NVIDIA support" -ForegroundColor White
Write-Host "4. Run: docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "🎮 To test locally (external APIs only):" -ForegroundColor Green
Write-Host "   docker-compose up zyglio redis" -ForegroundColor White
Write-Host ""
Write-Host "📚 See CONFIGURE_SELFHOSTED.md for detailed configuration options" -ForegroundColor Yellow 
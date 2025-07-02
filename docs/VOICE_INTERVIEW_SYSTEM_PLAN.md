# Voice Interview System – Implementation Plan

> Goal: Sub-2 s end-to-end latency for spoken Q&A, self-hosted on a single workstation (RTX 4070 Ti + Ryzen 7900X) with Supabase as the data source and fallback to hosted APIs.

---

## 📅 Phase 0 — Prerequisites & Environment

1. Hardware & OS readiness
   - [ ] Verify latest NVIDIA driver + CUDA 12.x on Windows 11 / WSL 2 or native Linux dual-boot.
   - [ ] Enable large BAR / Resizable BAR in BIOS (optional but boosts vLLM throughput).
2. Developer tooling
   - [ ] Install Node 18 LTS, Bun, PNPM.
   - [ ] Set up Docker Desktop (GPU-enabled) for Whisper/TTS containers.
   - [ ] Enable WSL g (WSLg) audio loopback if running under WSL.
3. Repository hygiene
   - [ ] Create `voice-inference/` monorepo folder for Dockerfiles and scripts.
   - [ ] Add `.env.template` with Supabase keys, model paths, port configs.

---

## 🚀 Phase 1 — Local Inference Stack

### 1A — LLM (vLLM)
- [ ] Install vLLM (`pip install vllm==0.4.*`) inside Python 3.11 venv.
- [ ] Download **Mistral-7B-Instruct Q4_K_M** weights (`huggingface-cli download ...`).
- [ ] Create `serve_llm.py` with:
  - `--gpu-memory-utilization 0.9`
  - `--max-num-batched-tokens 8192`
  - Model quantization offloading to CPU RAM when idle.
- [ ] Expose OpenAI-compatible endpoint on `http://localhost:8000/v1/*`.

### 1B — ASR (Whisper)
- [ ] Pull `ghcr.io/ggerganov/whisper.cpp:latest-cpu` Docker image.
- [ ] Mount models dir containing `ggml-tiny.en-q8.bin`.
- [ ] Run container with `--threads $(nproc)` and `--language en`.
- [ ] Implement WebSocket wrapper (`/ws/asr`) to stream 16 kHz PCM → partial transcripts.

### 1C — TTS
- [ ] Evaluate `coqui-ai/xtts-v2-english-only` CPU performance; fall back to OpenAI TTS.
- [ ] Build Dockerfile (`voice-xtts.dockerfile`) exposing `/api/tts?text=...` returning Opus.

### 1D — Process supervisor
- [ ] Create `pm2` or `systemd` unit files for LLM, ASR, TTS services.
- [ ] Configure health checks (`/healthz`) and auto-restart policies.

---

## 🧩 Phase 2 — Backend Integration (Next.js API Routes)

### 2A — Audio Ingress
- [ ] **`src/app/api/voice/transcribe/route.ts`**
  - Accept `POST` with `Content-Type: audio/webm; codecs=opus`.
  - Stream chunks → forward to `/ws/asr` WebSocket.
  - Stream JSON transcripts (partial + final) back via SSE.

### 2B — LLM Proxy
- [ ] **`src/lib/llm.ts`**
  - Axios client switching between `LOCAL_LLM_URL` and OpenAI.
  - Automatic fail-over on non-200 or >1 s first-token latency.

### 2C — Orchestrator Service
- [ ] **`src/lib/orchestrator.ts`**
  - Receives transcript chunks + conversation state.
  - Maintains sliding window (≤3 k LLM tokens) + running summary.
  - Defines tool schema: `generateSQL`, `vectorLookup`.
  - Executes function-call JSON → Supabase / pgvector.
  - Emits `assistant_message` stream via SSE.

---

## 🗄️ Phase 3 — Database & Vector Store

1. Schema introspection
   - [ ] Use `pg_introspection (pg_get_catalog_version)` to fetch tables, views, FKs.
   - [ ] Serialize schema to JSON → cache in Redis (TTL 24 h).
2. pgvector setup
   - [ ] Enable `CREATE EXTENSION IF NOT EXISTS pgvector;`.
   - [ ] Create `embeddings` table `{id, table_name, row_pkey, embedding}`.
3. Embedding batch job
   - [ ] `scripts/embed-common-rows.ts` to process FAQs / docs.
   - [ ] Store vectors with `supabase-js` upsert.

---

## 🎤 Phase 4 — Frontend / UX

1. Mic capture component (`voice-interview.tsx`)
   - [ ] Use MediaRecorder → fetch stream uploader.
   - [ ] Display live waveform & VAD state.
2. Transcript & response feed (`conversation-chat.tsx`)
   - [ ] Connect to SSE `/api/voice/transcribe` + `/api/voice/interview`.
   - [ ] Render partials in-place; commit on `is_final` flag.
3. Audio playback
   - [ ] Fetch TTS stream → `AudioContext` for low-latency start (<100 ms).

---

## 🔐 Phase 5 — Security & Guard-rails

- [ ] Supabase RLS: create `service_voice` role with `SELECT` only.
- [ ] Validate all SQL via `sqlparser` before execution.
- [ ] Limit prompt + transcript length to 6 k chars (prevent prompt injection).
- [ ] Obfuscate user PII in logs (regex scrub).

---

## 📊 Phase 6 — Observability & Monitoring

- [ ] Prometheus node exporter + NVIDIA DCGM exporter for GPU temps/util.
- [ ] Grafana dashboard: token/sec, ASR latency, SQL RTT, SSE lag.
- [ ] Loki for structured JSON logs; enable per-request trace IDs.

---

## 🧪 Phase 7 — Testing & Benchmarks

1. Unit tests
   - [ ] `jest` for orchestrator tool-calling logic.
2. Load tests
   - [ ] Artillery script simulating 5 concurrent interviews (10-min speech).
   - [ ] Capture p95 ASR latency, first-token time, overall round-trip.
3. Acceptance tests
   - [ ] Human QA session verifying under 2 s perceived delay.

---

## 🚢 Phase 8 — Deployment & Maintenance

- [ ] Write `deploy-local.ps1` / `.sh` to spin up PM2 + Docker containers.
- [ ] Nightly backup of Supabase & embeddings.
- [ ] Monthly LLM model update procedure (download → warm swap).
- [ ] Document rollback steps for each component.

---

### ❓ Open Questions / Future Work

- Should we eventually run Whisper small on GPU with dynamic VRAM swapping?
- Finetune Mistral 7B on collected Q&A pairs (LoRA) — schedule for Phase 9.
- Consider sharding interviews across multiple 4070 Ti boxes via gRPC.

---

> **Completion criteria**: End-to-end voice interview with ≤2 s response latency, 95th percentile, on local workstation without external LLM calls except fallback mode. 
/**
 * AI Service Adapter
 * Switches between local self-hosted AI services and external APIs
 * Provides automatic fallback and load balancing
 */

import OpenAI from 'openai';

interface AIAdapterConfig {
  provider: 'local' | 'external' | 'hybrid';
  localLLMUrl?: string;
  localWhisperUrl?: string;
  localTTSUrl?: string;
  fallbackToExternal?: boolean;
  timeoutMs?: number;
}

export class AIAdapter {
  private config: AIAdapterConfig;
  private localLLM: OpenAI | null = null;
  private externalLLM: OpenAI | null = null;

  constructor(config?: Partial<AIAdapterConfig>) {
    this.config = {
      provider: (process.env.AI_PROVIDER as any) || 'external',
      localLLMUrl: process.env.LOCAL_LLM_URL || 'http://localhost:8000/v1',
      localWhisperUrl: process.env.LOCAL_WHISPER_URL || 'http://localhost:9000',
      localTTSUrl: process.env.LOCAL_TTS_URL || 'http://localhost:8020',
      fallbackToExternal: process.env.SELF_HOSTED === 'true' ? true : false,
      timeoutMs: 15000,
      ...config
    };

    this.initializeClients();
  }

  private initializeClients() {
    // Initialize local LLM client if available
    if (this.config.localLLMUrl && (this.config.provider === 'local' || this.config.provider === 'hybrid')) {
      this.localLLM = new OpenAI({
        baseURL: this.config.localLLMUrl,
        apiKey: 'local-key', // Local services usually don't need real API keys
        timeout: this.config.timeoutMs,
      });
    }

    // Initialize external LLM client if available
    if (process.env.DEEPSEEK_API_KEY && (this.config.provider === 'external' || this.config.provider === 'hybrid')) {
      this.externalLLM = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
        timeout: this.config.timeoutMs,
        maxRetries: 2,
        defaultHeaders: {
          'Connection': 'keep-alive'
        }
      });
    }
  }

  /**
   * Generate chat completion with automatic provider selection and fallback
   */
  async generateCompletion(messages: any[], options: any = {}): Promise<string> {
    const { temperature = 0.7, maxTokens = 2000, model = 'mistral-7b-instruct' } = options;

    // Try local first if configured
    if (this.config.provider === 'local' || this.config.provider === 'hybrid') {
      try {
        const response = await this.generateLocalCompletion(messages, { temperature, maxTokens, model });
        if (response) return response;
      } catch (error) {
        console.warn('Local LLM failed, attempting fallback:', error);
        if (!this.config.fallbackToExternal) throw error;
      }
    }

    // Try external as primary or fallback
    if (this.config.provider === 'external' || this.config.fallbackToExternal) {
      try {
        const response = await this.generateExternalCompletion(messages, { temperature, maxTokens });
        if (response) return response;
      } catch (error) {
        console.error('External LLM also failed:', error);
        throw new Error('All AI services unavailable');
      }
    }

    throw new Error('No AI providers configured or available');
  }

  private async generateLocalCompletion(messages: any[], options: any): Promise<string | null> {
    if (!this.localLLM) return null;

    try {
      const response = await this.localLLM.chat.completions.create({
        model: options.model || 'mistral-7b-instruct',
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Local LLM error:', error);
      return null;
    }
  }

  private async generateExternalCompletion(messages: any[], options: any): Promise<string | null> {
    if (!this.externalLLM) return null;

    try {
      const response = await this.externalLLM.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('External LLM error:', error);
      return null;
    }
  }

  /**
   * Transcribe audio using local Whisper or external service
   */
  async transcribeAudio(audioFile: File | Buffer): Promise<string> {
    // Try local Whisper first
    if (this.config.provider === 'local' || this.config.provider === 'hybrid') {
      try {
        const response = await this.transcribeLocal(audioFile);
        if (response) return response;
      } catch (error) {
        console.warn('Local Whisper failed, attempting fallback:', error);
        if (!this.config.fallbackToExternal) throw error;
      }
    }

    // Fallback to external service
    if (this.config.provider === 'external' || this.config.fallbackToExternal) {
      return await this.transcribeExternal(audioFile);
    }

    throw new Error('No transcription services available');
  }

  private async transcribeLocal(audioFile: File | Buffer): Promise<string | null> {
    if (!this.config.localWhisperUrl) return null;

    try {
      const formData = new FormData();
      formData.append('audio_file', audioFile instanceof Buffer ? new Blob([audioFile]) : audioFile);
      formData.append('task', 'transcribe');
      formData.append('language', 'en');

      const response = await fetch(`${this.config.localWhisperUrl}/asr`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Local Whisper error:', error);
      return null;
    }
  }

  private async transcribeExternal(audioFile: File | Buffer): Promise<string> {
    // Implementation would use OpenAI Whisper API or similar
    // This is a placeholder for external transcription
    throw new Error('External transcription not implemented in this adapter');
  }

  /**
   * Generate speech using local XTTS or external TTS
   */
  async generateSpeech(text: string, voice?: string): Promise<Buffer> {
    // Try local TTS first
    if (this.config.provider === 'local' || this.config.provider === 'hybrid') {
      try {
        const response = await this.generateSpeechLocal(text, voice);
        if (response) return response;
      } catch (error) {
        console.warn('Local TTS failed, attempting fallback:', error);
        if (!this.config.fallbackToExternal) throw error;
      }
    }

    // Fallback to external service
    if (this.config.provider === 'external' || this.config.fallbackToExternal) {
      return await this.generateSpeechExternal(text, voice);
    }

    throw new Error('No TTS services available');
  }

  private async generateSpeechLocal(text: string, voice?: string): Promise<Buffer | null> {
    if (!this.config.localTTSUrl) return null;

    try {
      const response = await fetch(`${this.config.localTTSUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voice: voice || 'default',
          language: 'en'
        }),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      return null;
    } catch (error) {
      console.error('Local TTS error:', error);
      return null;
    }
  }

  private async generateSpeechExternal(text: string, voice?: string): Promise<Buffer> {
    // Implementation would use ElevenLabs or OpenAI TTS
    // This is a placeholder for external TTS
    throw new Error('External TTS not implemented in this adapter');
  }

  /**
   * Health check for all configured services
   */
  async healthCheck(): Promise<{ local: boolean; external: boolean }> {
    const health = { local: false, external: false };

    // Check local services
    if (this.localLLM && this.config.localLLMUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.config.localLLMUrl.replace('/v1', '')}/health`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        health.local = response.ok;
      } catch {
        health.local = false;
      }
    }

    // Check external services
    if (this.externalLLM) {
      try {
        // Simple test completion
        await this.externalLLM.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        health.external = true;
      } catch {
        health.external = false;
      }
    }

    return health;
  }

  /**
   * Get current provider status
   */
  getStatus() {
    return {
      provider: this.config.provider,
      localAvailable: !!this.localLLM,
      externalAvailable: !!this.externalLLM,
      fallbackEnabled: this.config.fallbackToExternal,
    };
  }
}

// Export singleton instance
export const aiAdapter = new AIAdapter();

// Export factory function for custom configurations
export const createAIAdapter = (config: Partial<AIAdapterConfig>) => {
  return new AIAdapter(config);
}; 
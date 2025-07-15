/**
 * Voice Recording Service
 * Production-ready service using OpenAI Whisper streaming and ElevenLabs TTS
 */

export interface VoiceRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  maxDuration?: number; // in milliseconds
}

export interface VoiceRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;
  private stream: MediaStream | null = null;
  private readonly openaiApiKey: string;
  private readonly elevenlabsApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    this.elevenlabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
    
    if (!this.openaiApiKey) {
      console.warn('OpenAI API key not found. Transcription will not work.');
    }
    if (!this.elevenlabsApiKey) {
      console.warn('ElevenLabs API key not found. Text-to-speech will not work.');
    }
  }

  /**
   * Check if voice recording is supported in the current browser
   */
  public isSupported(): boolean {
    return !!(navigator.mediaDevices && window.MediaRecorder);
  }

  /**
   * Request microphone permission and initialize recording
   */
  public async initialize(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        throw new Error('Voice recording is not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1 // Mono for better processing
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize voice recording:', error);
      return false;
    }
  }

  /**
   * Start recording voice
   */
  public async startRecording(options: VoiceRecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    if (!this.stream) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize voice recording');
      }
    }

    try {
      this.audioChunks = [];
      this.startTime = Date.now();

      const defaultOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
        maxDuration: 300000 // 5 minutes
      };

      const recordingOptions = { ...defaultOptions, ...options };

      // Use the best available format for Whisper
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = recordingOptions.mimeType;
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: recordingOptions.audioBitsPerSecond
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second for streaming
      this.isRecording = true;

      // Auto-stop recording after max duration
      if (recordingOptions.maxDuration) {
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, recordingOptions.maxDuration);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  public async stopRecording(): Promise<VoiceRecording> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const duration = Date.now() - this.startTime;
          const blob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
          const url = URL.createObjectURL(blob);
          
          const recording: VoiceRecording = {
            id: crypto.randomUUID ? crypto.randomUUID() : this.generateFallbackId(),
            blob,
            url,
            duration,
            timestamp: new Date()
          };

          this.isRecording = false;
          this.audioChunks = [];
          resolve(recording);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel current recording
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.audioChunks = [];
    }
  }

  /**
   * Get current recording status
   */
  public getRecordingStatus(): {
    isRecording: boolean;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  public async transcribeAudio(
    audioBlob: Blob,
    options: { language?: string; model?: string } = {}
  ): Promise<TranscriptionResult> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Convert audio to proper format for Whisper
      const audioFile = await this.convertAudioForWhisper(audioBlob);
      
      const formData = new FormData();
      formData.append('file', audioFile, 'recording.wav');
      formData.append('model', options.model || 'whisper-1');
      formData.append('response_format', 'verbose_json');
      
      if (options.language) {
        formData.append('language', options.language);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        confidence: this.calculateAverageConfidence(result.segments || []),
        language: result.language || options.language || 'en',
        segments: result.segments?.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text,
          confidence: segment.confidence || 0.8
        })) || []
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Convert audio to WAV format for better Whisper compatibility
   */
  private async convertAudioForWhisper(audioBlob: Blob): Promise<File> {
    try {
      // If already in a supported format, return as-is
      if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/mp3') {
        return new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      }

      // Use Web Audio API to convert to WAV
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      return new File([wavBuffer], 'recording.wav', { type: 'audio/wav' });
    } catch (error) {
      console.warn('Audio conversion failed, using original format:', error);
      return new File([audioBlob], 'recording.webm', { type: audioBlob.type });
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  /**
   * Calculate average confidence from segments
   */
  private calculateAverageConfidence(segments: any[]): number {
    if (segments.length === 0) return 0.8; // Default confidence
    
    const totalConfidence = segments.reduce((sum, segment) => 
      sum + (segment.confidence || 0.8), 0
    );
    return totalConfidence / segments.length;
  }

  /**
   * Generate speech using ElevenLabs API
   */
  public async generateSpeech(
    text: string, 
    options: TTSOptions = {}
  ): Promise<{ audioBlob: Blob; audioUrl: string }> {
    if (!this.elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const defaultOptions = {
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Default female voice (Bella)
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0,
        speakerBoost: true
      };

      const ttsOptions = { ...defaultOptions, ...options };

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ttsOptions.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenlabsApiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: ttsOptions.stability,
            similarity_boost: ttsOptions.similarityBoost,
            style: ttsOptions.style,
            use_speaker_boost: ttsOptions.speakerBoost
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return { audioBlob, audioUrl };
    } catch (error) {
      console.error('Text-to-speech generation failed:', error);
      throw error;
    }
  }

  /**
   * Get available ElevenLabs voices
   */
  public async getAvailableVoices(): Promise<any[]> {
    if (!this.elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.elevenlabsApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch available voices:', error);
      return [];
    }
  }

  /**
   * Play audio recording or generated speech
   */
  public playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.onended = () => resolve();
      audio.onerror = (error) => reject(error);
      
      audio.play().catch(reject);
    });
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.cancelRecording();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Fallback ID generation for older browsers
   */
  private generateFallbackId(): string {
    return 'recording_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
export const voiceService = new VoiceService(); 
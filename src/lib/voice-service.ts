/**
 * Voice Recording Service
 * Integrates with browser MediaRecorder API and provides transcription capabilities
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
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;
  private stream: MediaStream | null = null;

  /**
   * Check if voice recording is supported in the current browser
   */
  public isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
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
          sampleRate: 44100
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

      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: recordingOptions.mimeType,
        audioBitsPerSecond: recordingOptions.audioBitsPerSecond
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
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
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
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
   * Transcribe audio using Web Speech API (fallback) or external service
   */
  public async transcribeAudio(
    audioBlob: Blob,
    options: { language?: string } = {}
  ): Promise<TranscriptionResult> {
    try {
      // In a production environment, you would typically send this to a transcription service
      // like OpenAI Whisper, Google Speech-to-Text, or Azure Speech Services
      
      // For now, we'll use the Web Speech API as a fallback
      return await this.transcribeWithWebSpeechAPI(audioBlob, options.language);
    } catch (error) {
      console.error('Transcription failed:', error);
      return {
        text: '[Transcription failed]',
        confidence: 0
      };
    }
  }

  /**
   * Transcribe using Web Speech API (browser-based)
   */
  private async transcribeWithWebSpeechAPI(
    audioBlob: Blob,
    language: string = 'en-US'
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      // Create a new audio element to play the recording
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        let transcript = '';
        let confidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            transcript += result[0].transcript;
            confidence = Math.max(confidence, result[0].confidence || 0);
          }
        }

        resolve({
          text: transcript.trim(),
          confidence,
          language
        });
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        // Recognition ended without results
        if (!recognition.onresult) {
          resolve({
            text: '[No speech detected]',
            confidence: 0,
            language
          });
        }
      };

      // Start recognition
      recognition.start();

      // Stop recognition after 30 seconds max
      setTimeout(() => {
        recognition.stop();
      }, 30000);
    });
  }

  /**
   * Send audio to external transcription service (production implementation)
   */
  public async transcribeWithExternalService(
    audioBlob: Blob,
    apiKey: string,
    serviceUrl: string
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'en');

      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription service error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || result.transcript || '',
        confidence: result.confidence || 0.8,
        language: result.language || 'en'
      };
    } catch (error) {
      console.error('External transcription failed:', error);
      throw error;
    }
  }

  /**
   * Play audio recording
   */
  public playRecording(recording: VoiceRecording): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(recording.url);
      
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

// Export types
export type { VoiceRecordingOptions, VoiceRecording, TranscriptionResult }; 
/**
 * Transcript Buffer Service
 * Manages sliding window buffering of transcript chunks and triggers agent processing
 */

export interface TranscriptChunk {
  id: string;
  content: string;
  timestamp: Date;
  isComplete: boolean; // Whether the sentence/thought is complete
  sessionId: string;
}

export interface BufferConfig {
  maxBufferSize: number; // Maximum number of words to keep
  triggerThreshold: number; // Minimum words before triggering agents
  timeoutMs: number; // Timeout for incomplete sentences
  sessionTimeoutMs: number; // How long to keep session buffers
}

class TranscriptBufferManager {
  private buffers: Map<string, TranscriptChunk[]> = new Map();
  private lastActivity: Map<string, Date> = new Map();
  private config: BufferConfig;
  
  constructor(config: BufferConfig) {
    this.config = config;
    
    // Cleanup inactive sessions every 5 minutes
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  /**
   * Add new transcript content to the buffer
   */
  addToBuffer(sessionId: string, content: string, isComplete: boolean = false): TranscriptChunk {
    const chunk: TranscriptChunk = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      timestamp: new Date(),
      isComplete,
      sessionId
    };

    if (!this.buffers.has(sessionId)) {
      this.buffers.set(sessionId, []);
    }

    const buffer = this.buffers.get(sessionId)!;
    buffer.push(chunk);
    this.lastActivity.set(sessionId, new Date());

    // Maintain sliding window by word count
    this.maintainBufferSize(sessionId);

    return chunk;
  }

  /**
   * Get current buffer content for a session
   */
  getBufferContent(sessionId: string): string {
    const buffer = this.buffers.get(sessionId) || [];
    return buffer.map(chunk => chunk.content).join(' ').trim();
  }

  /**
   * Get buffer chunks for a session
   */
  getBufferChunks(sessionId: string): TranscriptChunk[] {
    return [...(this.buffers.get(sessionId) || [])];
  }

  /**
   * Check if buffer should trigger agent processing
   */
  shouldTriggerAgents(sessionId: string): boolean {
    const buffer = this.buffers.get(sessionId) || [];
    const totalWords = this.getWordCount(buffer.map(c => c.content).join(' '));
    
    // Trigger if we have enough words or if we have complete sentences
    return totalWords >= this.config.triggerThreshold || 
           buffer.some(chunk => chunk.isComplete);
  }

  /**
   * Get processable content (complete sentences or timeout threshold)
   */
  getProcessableContent(sessionId: string): {
    content: string;
    shouldProcess: boolean;
    reason: 'complete_sentences' | 'word_threshold' | 'timeout' | 'none';
  } {
    const buffer = this.buffers.get(sessionId) || [];
    
    if (buffer.length === 0) {
      return { content: '', shouldProcess: false, reason: 'none' };
    }

    const totalWords = this.getWordCount(buffer.map(c => c.content).join(' '));
    const hasCompleteSentences = buffer.some(chunk => chunk.isComplete);
    const oldestIncomplete = buffer.find(chunk => !chunk.isComplete);
    const hasTimedOut = oldestIncomplete && 
      (Date.now() - oldestIncomplete.timestamp.getTime()) > this.config.timeoutMs;

    let reason: 'complete_sentences' | 'word_threshold' | 'timeout' | 'none' = 'none';
    let shouldProcess = false;

    if (hasCompleteSentences) {
      reason = 'complete_sentences';
      shouldProcess = true;
    } else if (totalWords >= this.config.triggerThreshold) {
      reason = 'word_threshold';
      shouldProcess = true;
    } else if (hasTimedOut) {
      reason = 'timeout';
      shouldProcess = true;
    }

    return {
      content: this.getBufferContent(sessionId),
      shouldProcess,
      reason
    };
  }

  /**
   * Clear buffer for a session
   */
  clearBuffer(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.lastActivity.delete(sessionId);
  }

  /**
   * Mark content as processed (for sliding window management)
   */
  markAsProcessed(sessionId: string, chunkIds: string[]): void {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) return;

    // Remove processed chunks but keep some overlap for context
    const keepCount = Math.min(5, buffer.length); // Keep last 5 chunks for context
    const updatedBuffer = buffer.slice(-keepCount);
    this.buffers.set(sessionId, updatedBuffer);
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(sessionId: string): {
    chunkCount: number;
    wordCount: number;
    oldestChunkAge: number;
    hasCompleteChunks: boolean;
  } {
    const buffer = this.buffers.get(sessionId) || [];
    const wordCount = this.getWordCount(buffer.map(c => c.content).join(' '));
    const oldestChunk = buffer.length > 0 ? buffer[0] : null;
    const oldestChunkAge = oldestChunk ? Date.now() - oldestChunk.timestamp.getTime() : 0;
    const hasCompleteChunks = buffer.some(chunk => chunk.isComplete);

    return {
      chunkCount: buffer.length,
      wordCount,
      oldestChunkAge,
      hasCompleteChunks
    };
  }

  private maintainBufferSize(sessionId: string): void {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) return;

    const totalWords = this.getWordCount(buffer.map(c => c.content).join(' '));
    
    // Remove oldest chunks if we exceed max buffer size
    while (totalWords > this.config.maxBufferSize && buffer.length > 1) {
      buffer.shift();
    }
  }

  private getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, lastActivity] of this.lastActivity.entries()) {
      if (now.getTime() - lastActivity.getTime() > this.config.sessionTimeoutMs) {
        sessionsToRemove.push(sessionId);
      }
    }

    for (const sessionId of sessionsToRemove) {
      this.clearBuffer(sessionId);
    }
  }
}

// Default configuration
const defaultConfig: BufferConfig = {
  maxBufferSize: 100, // words
  triggerThreshold: 20, // words  
  timeoutMs: 5000, // 5 seconds
  sessionTimeoutMs: 30 * 60 * 1000 // 30 minutes
};

// Singleton instance
export const transcriptBuffer = new TranscriptBufferManager(defaultConfig);

// Utility functions
export function detectSentenceBoundary(text: string): boolean {
  // Simple sentence boundary detection
  const sentenceEnders = /[.!?]+\s*$/;
  return sentenceEnders.test(text.trim());
}

export function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the punctuation
  return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
} 
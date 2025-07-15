import OpenAI from 'openai';
import { getCachedResponse, cacheResponse, shouldUseFastModel, getOptimizedPrompt } from './ai-cache';

// Fast model for initial processing
const fastModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 5000,
  maxRetries: 1,
});

// Regular model for detailed work
const detailedModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1', 
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 10000,
  maxRetries: 1,
});

interface StreamingContext {
  partialInput: string;
  accumulatedTokens: string[];
  isProcessing: boolean;
  lastProcessedLength: number;
  priority: 'speed' | 'quality';
  task: string;
}

// Real-time streaming processor
export class StreamingAIProcessor {
  private contexts = new Map<string, StreamingContext>();
  private processQueue = new Set<string>();
  
  // Initialize a streaming context
  initializeStream(sessionId: string, task: string, priority: 'speed' | 'quality' = 'speed'): void {
    this.contexts.set(sessionId, {
      partialInput: '',
      accumulatedTokens: [],
      isProcessing: false,
      lastProcessedLength: 0,
      priority,
      task
    });
  }
  
  // Process incoming speech chunks in real-time
  async processPartialInput(sessionId: string, newChunk: string): Promise<any> {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error('Stream not initialized');
    
    context.partialInput += newChunk;
    
    // Check if we have enough content to start processing
    const words = context.partialInput.split(/\s+/);
    const shouldProcess = words.length >= 10 && 
                         !context.isProcessing && 
                         (words.length - context.lastProcessedLength) >= 5;
    
    if (shouldProcess) {
      return this.startProcessingChunk(sessionId);
    }
    
    return null;
  }
  
  // Process current chunk with streaming response
  private async startProcessingChunk(sessionId: string): Promise<ReadableStream> {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error('Context not found');
    
    context.isProcessing = true;
    context.lastProcessedLength = context.partialInput.split(/\s+/).length;
    
    // Check cache first
    const cacheKey = `${context.task}_${context.partialInput.substring(0, 100)}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      context.isProcessing = false;
      return this.createStreamFromCached(cached);
    }
    
    // Two-stage processing
    const useFastModel = shouldUseFastModel(context.partialInput, { 
      task: context.task,
      priority: context.priority 
    });
    
    const model = useFastModel ? fastModel : detailedModel;
    const prompt = getOptimizedPrompt(context.task, { 
      streaming: true, 
      priority: context.priority 
    });
    
    try {
      const stream = await model.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: context.partialInput }
        ],
        stream: true,
        temperature: 0.2,
        max_tokens: useFastModel ? 150 : 300,
      });
      
      return this.processStreamingResponse(sessionId, stream, cacheKey);
      
    } catch (error) {
      context.isProcessing = false;
      throw error;
    }
  }
  
  // Process streaming response and accumulate tokens
  private processStreamingResponse(sessionId: string, stream: any, cacheKey: string): ReadableStream {
    const context = this.contexts.get(sessionId);
    let accumulatedResponse = '';
    
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              accumulatedResponse += delta;
              context?.accumulatedTokens.push(delta);
              
              // Send chunk to client
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                type: 'token',
                content: delta,
                sessionId
              })}\n\n`));
            }
          }
          
          // Cache the complete response
          if (accumulatedResponse) {
            cacheResponse(cacheKey, accumulatedResponse);
          }
          
          // Send completion signal
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'complete',
            content: accumulatedResponse,
            sessionId
          })}\n\n`));
          
          controller.close();
          
          if (context) {
            context.isProcessing = false;
          }
          
        } catch (error) {
          controller.error(error);
          if (context) {
            context.isProcessing = false;
          }
        }
      }
    });
  }
  
  // Create stream from cached response (simulate streaming)
  private createStreamFromCached(cached: string): ReadableStream {
    const tokens = cached.split(/(\s+)/).filter(Boolean);
    let index = 0;
    
    return new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          if (index < tokens.length) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
              type: 'token',
              content: tokens[index],
              cached: true
            })}\n\n`));
            index++;
          } else {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
              type: 'complete',
              content: cached,
              cached: true
            })}\n\n`));
            controller.close();
            clearInterval(interval);
          }
        }, 50); // 50ms delay between tokens for natural feel
      }
    });
  }
  
  // Get current processing status
  getStatus(sessionId: string) {
    const context = this.contexts.get(sessionId);
    if (!context) return null;
    
    return {
      isProcessing: context.isProcessing,
      inputLength: context.partialInput.length,
      tokensGenerated: context.accumulatedTokens.length,
      lastProcessedLength: context.lastProcessedLength
    };
  }
  
  // Finalize the stream when user stops talking
  async finalizeStream(sessionId: string): Promise<any> {
    const context = this.contexts.get(sessionId);
    if (!context) return null;
    
    // Wait for any ongoing processing to complete
    while (context.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Process any remaining input
    if (context.partialInput.length > context.lastProcessedLength) {
      const finalResult = await this.processFinalInput(sessionId);
      this.contexts.delete(sessionId);
      return finalResult;
    }
    
    const result = {
      fullInput: context.partialInput,
      generatedTokens: context.accumulatedTokens.join(''),
      tokenCount: context.accumulatedTokens.length
    };
    
    this.contexts.delete(sessionId);
    return result;
  }
  
  // Process final complete input
  private async processFinalInput(sessionId: string): Promise<any> {
    const context = this.contexts.get(sessionId);
    if (!context) return null;
    
    const cacheKey = `final_${context.task}_${context.partialInput}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
    
    const useFastModel = shouldUseFastModel(context.partialInput, { task: context.task });
    const model = useFastModel ? fastModel : detailedModel;
    const prompt = getOptimizedPrompt(context.task, { priority: context.priority });
    
    const completion = await model.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: context.partialInput }
      ],
      temperature: 0.3,
      max_tokens: useFastModel ? 200 : 500,
    });
    
    const result = completion.choices[0]?.message?.content || '';
    cacheResponse(cacheKey, result);
    
    return result;
  }
  
  // Clean up inactive streams
  cleanup(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    Array.from(this.contexts.entries()).forEach(([sessionId, context]) => {
      // Remove contexts that haven't been updated recently
      if (!context.isProcessing) {
        this.contexts.delete(sessionId);
      }
    });
  }
}

// Singleton instance
export const streamingProcessor = new StreamingAIProcessor();

// Auto-cleanup every 5 minutes
setInterval(() => {
  streamingProcessor.cleanup();
}, 5 * 60 * 1000); 
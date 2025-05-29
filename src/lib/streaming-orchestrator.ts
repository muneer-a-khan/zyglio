/**
 * Streaming Orchestrator
 * Manages transcript buffering, agent coordination, and WebSocket streaming
 */

import { 
  transcriptBuffer, 
  detectSentenceBoundary, 
  splitIntoSentences,
  type TranscriptChunk 
} from './transcript-buffer';
import {
  streamValidationAgent,
  streamClarificationAgent,
  streamFollowUpAgent,
  streamTopicAnalysisAgent,
  streamTopicDiscoveryAgent,
  type StreamingContext,
  type AgentStreamResult,
  type AgentStreamCallback
} from './streaming-agents';
import { getSessionData } from './session-service';

export interface OrchestratorConfig {
  enableValidation: boolean;
  enableClarification: boolean;
  enableFollowUp: boolean;
  enableTopicAnalysis: boolean;
  enableTopicDiscovery: boolean;
  parallelValidationAndDiscovery: boolean;
}

export interface StreamEvent {
  type: 'agent_start' | 'agent_stream' | 'agent_complete' | 'context_update' | 'error';
  agentType?: string;
  content?: string;
  metadata?: any;
  sessionId: string;
  timestamp: Date;
}

export type StreamEventCallback = (event: StreamEvent) => void;

export interface SharedContext {
  validationResult?: {
    confidence: number;
    issues: string[];
    feedback: string;
  };
  clarificationResult?: {
    priority: 'high' | 'medium' | 'low';
    questions: string[];
  };
  followUpResult?: {
    category: string;
    reasoning: string;
    question: string;
  };
  topicAnalysisResult?: {
    topicsCovered: string[];
    missingTopics: string[];
  };
  topicDiscoveryResult?: {
    newTopics: string[];
    recommendations: string[];
  };
}

class StreamingOrchestratorManager {
  private config: OrchestratorConfig;
  private activeStreams: Map<string, Set<string>> = new Map(); // sessionId -> Set of active agent types
  private sharedContexts: Map<string, SharedContext> = new Map(); // sessionId -> shared context
  private streamCallbacks: Map<string, StreamEventCallback> = new Map(); // sessionId -> callback

  constructor(config: OrchestratorConfig) {
    this.config = config;
    
    // Start the processing loop
    this.startProcessingLoop();
  }

  /**
   * Register a stream callback for a session
   */
  registerCallback(sessionId: string, callback: StreamEventCallback): void {
    this.streamCallbacks.set(sessionId, callback);
  }

  /**
   * Unregister callback for a session
   */
  unregisterCallback(sessionId: string): void {
    this.streamCallbacks.delete(sessionId);
    this.activeStreams.delete(sessionId);
    this.sharedContexts.delete(sessionId);
  }

  /**
   * Add transcript content to buffer
   */
  addTranscriptContent(sessionId: string, content: string): void {
    // Detect if this looks like a complete sentence
    const isComplete = detectSentenceBoundary(content);
    
    // Add to buffer
    transcriptBuffer.addToBuffer(sessionId, content, isComplete);
    
    // Check if we should trigger processing
    this.checkAndTriggerProcessing(sessionId);
  }

  /**
   * Force trigger processing for a session (e.g., on pause or timeout)
   */
  forceTriggerProcessing(sessionId: string): void {
    this.triggerAgentProcessing(sessionId);
  }

  /**
   * Get current buffer stats for a session
   */
  getBufferStats(sessionId: string) {
    return transcriptBuffer.getBufferStats(sessionId);
  }

  private startProcessingLoop(): void {
    // Check for processing opportunities every 2 seconds
    setInterval(() => {
      this.processPendingBuffers();
    }, 2000);
  }

  private processPendingBuffers(): void {
    // Get all sessions with content to process
    for (const [sessionId, callback] of this.streamCallbacks.entries()) {
      const processable = transcriptBuffer.getProcessableContent(sessionId);
      
      if (processable.shouldProcess && processable.content.trim()) {
        this.triggerAgentProcessing(sessionId);
      }
    }
  }

  private checkAndTriggerProcessing(sessionId: string): void {
    const processable = transcriptBuffer.getProcessableContent(sessionId);
    
    if (processable.shouldProcess && processable.content.trim()) {
      this.triggerAgentProcessing(sessionId);
    }
  }

  private async triggerAgentProcessing(sessionId: string): Promise<void> {
    // Prevent duplicate processing
    if (this.activeStreams.has(sessionId) && this.activeStreams.get(sessionId)!.size > 0) {
      return;
    }

    const content = transcriptBuffer.getBufferContent(sessionId);
    if (!content.trim()) {
      return;
    }

    try {
      // Get session data for context
      const sessionData = await getSessionData(sessionId);
      if (!sessionData) {
        console.error(`Session ${sessionId} not found`);
        return;
      }

      // Build streaming context
      const context: StreamingContext = {
        transcript: content,
        procedureContext: sessionData.initialContext,
        conversationHistory: sessionData.conversationHistory || [],
        sessionId,
        topics: sessionData.topics || []
      };

      // Initialize active streams tracking
      this.activeStreams.set(sessionId, new Set());
      const activeAgents = this.activeStreams.get(sessionId)!;

      // Get or create shared context
      if (!this.sharedContexts.has(sessionId)) {
        this.sharedContexts.set(sessionId, {});
      }
      const sharedContext = this.sharedContexts.get(sessionId)!;

      // Create stream callback for this session
      const callback = this.streamCallbacks.get(sessionId);
      if (!callback) {
        return;
      }

      const createAgentCallback = (agentType: string): AgentStreamCallback => {
        return (result: AgentStreamResult) => {
          // Update shared context when agents complete
          if (result.isComplete) {
            this.updateSharedContext(sessionId, agentType, result);
            activeAgents.delete(agentType);
            
            // Emit completion event
            callback({
              type: 'agent_complete',
              agentType,
              content: result.content,
              metadata: result.metadata,
              sessionId,
              timestamp: new Date()
            });

            // Check if we should trigger dependent agents
            this.triggerDependentAgents(sessionId, agentType, context, createAgentCallback);
          } else {
            // Emit streaming event
            callback({
              type: 'agent_stream',
              agentType,
              content: result.content,
              metadata: result.metadata,
              sessionId,
              timestamp: new Date()
            });
          }
        };
      };

      // Start agents based on configuration and dependencies
      await this.startInitialAgents(sessionId, context, createAgentCallback);

    } catch (error) {
      console.error(`Error processing agents for session ${sessionId}:`, error);
      const callback = this.streamCallbacks.get(sessionId);
      if (callback) {
        callback({
          type: 'error',
          content: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sessionId,
          timestamp: new Date()
        });
      }
    }
  }

  private async startInitialAgents(
    sessionId: string,
    context: StreamingContext,
    createAgentCallback: (agentType: string) => AgentStreamCallback
  ): Promise<void> {
    const activeAgents = this.activeStreams.get(sessionId)!;
    const callback = this.streamCallbacks.get(sessionId)!;

    // Start validation agent first (highest priority)
    if (this.config.enableValidation) {
      activeAgents.add('validation');
      callback({
        type: 'agent_start',
        agentType: 'validation',
        sessionId,
        timestamp: new Date()
      });
      
      streamValidationAgent(context, createAgentCallback('validation'));
    }

    // Start topic discovery in parallel if configured
    if (this.config.enableTopicDiscovery && this.config.parallelValidationAndDiscovery) {
      activeAgents.add('topic-discovery');
      callback({
        type: 'agent_start',
        agentType: 'topic-discovery',
        sessionId,
        timestamp: new Date()
      });
      
      streamTopicDiscoveryAgent(context, createAgentCallback('topic-discovery'));
    }

    // Start topic analysis
    if (this.config.enableTopicAnalysis) {
      activeAgents.add('topic-analysis');
      callback({
        type: 'agent_start',
        agentType: 'topic-analysis',
        sessionId,
        timestamp: new Date()
      });
      
      streamTopicAnalysisAgent(context, createAgentCallback('topic-analysis'));
    }
  }

  private async triggerDependentAgents(
    sessionId: string,
    completedAgentType: string,
    context: StreamingContext,
    createAgentCallback: (agentType: string) => AgentStreamCallback
  ): Promise<void> {
    const activeAgents = this.activeStreams.get(sessionId)!;
    const callback = this.streamCallbacks.get(sessionId)!;
    const sharedContext = this.sharedContexts.get(sessionId)!;

    // Update context with validation results for dependent agents
    if (completedAgentType === 'validation') {
      const updatedContext = {
        ...context,
        validationResult: sharedContext.validationResult
      };

      // Start clarification agent after validation
      if (this.config.enableClarification && !activeAgents.has('clarification')) {
        activeAgents.add('clarification');
        callback({
          type: 'agent_start',
          agentType: 'clarification',
          sessionId,
          timestamp: new Date()
        });
        
        streamClarificationAgent(updatedContext, createAgentCallback('clarification'));
      }
    }

    // Start follow-up after clarification (or validation if clarification disabled)
    if (completedAgentType === 'clarification' || 
        (completedAgentType === 'validation' && !this.config.enableClarification)) {
      
      if (this.config.enableFollowUp && !activeAgents.has('follow-up')) {
        const updatedContext = {
          ...context,
          validationResult: sharedContext.validationResult,
          clarificationResult: sharedContext.clarificationResult
        };

        activeAgents.add('follow-up');
        callback({
          type: 'agent_start',
          agentType: 'follow-up',
          sessionId,
          timestamp: new Date()
        });
        
        streamFollowUpAgent(updatedContext, createAgentCallback('follow-up'));
      }
    }

    // Start topic discovery if not already started in parallel
    if (completedAgentType === 'validation' && 
        this.config.enableTopicDiscovery && 
        !this.config.parallelValidationAndDiscovery &&
        !activeAgents.has('topic-discovery')) {
      
      activeAgents.add('topic-discovery');
      callback({
        type: 'agent_start',
        agentType: 'topic-discovery',
        sessionId,
        timestamp: new Date()
      });
      
      streamTopicDiscoveryAgent(context, createAgentCallback('topic-discovery'));
    }
  }

  private updateSharedContext(sessionId: string, agentType: string, result: AgentStreamResult): void {
    const sharedContext = this.sharedContexts.get(sessionId);
    if (!sharedContext) return;

    switch (agentType) {
      case 'validation':
        sharedContext.validationResult = {
          confidence: result.metadata?.confidence || 0,
          issues: result.metadata?.issues || [],
          feedback: result.content
        };
        break;
      case 'clarification':
        sharedContext.clarificationResult = {
          priority: result.metadata?.priority || 'medium',
          questions: result.metadata?.questions || []
        };
        break;
      case 'follow-up':
        sharedContext.followUpResult = {
          category: result.metadata?.category || 'general',
          reasoning: result.metadata?.reasoning || '',
          question: result.metadata?.question || ''
        };
        break;
      case 'topic-analysis':
        sharedContext.topicAnalysisResult = {
          topicsCovered: result.metadata?.topicsCovered || [],
          missingTopics: result.metadata?.missingTopics || []
        };
        break;
      case 'topic-discovery':
        sharedContext.topicDiscoveryResult = {
          newTopics: result.metadata?.newTopics || [],
          recommendations: result.metadata?.recommendations || []
        };
        break;
    }

    // Emit context update event
    const callback = this.streamCallbacks.get(sessionId);
    if (callback) {
      callback({
        type: 'context_update',
        content: JSON.stringify(sharedContext),
        metadata: { agentType, updatedContext: sharedContext },
        sessionId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get current shared context for a session
   */
  getSharedContext(sessionId: string): SharedContext | undefined {
    return this.sharedContexts.get(sessionId);
  }

  /**
   * Clear all data for a session
   */
  clearSession(sessionId: string): void {
    this.activeStreams.delete(sessionId);
    this.sharedContexts.delete(sessionId);
    this.streamCallbacks.delete(sessionId);
    transcriptBuffer.clearBuffer(sessionId);
  }
}

// Default configuration
const defaultConfig: OrchestratorConfig = {
  enableValidation: true,
  enableClarification: true,
  enableFollowUp: true,
  enableTopicAnalysis: true,
  enableTopicDiscovery: true,
  parallelValidationAndDiscovery: true
};

// Singleton instance
export const streamingOrchestrator = new StreamingOrchestratorManager(defaultConfig);

// Utility functions for priority-based response selection
export function selectPrimaryResponse(context: SharedContext): {
  responseText: string;
  priority: 'validation' | 'clarification' | 'follow-up';
  metadata: any;
} {
  // Validation issues take highest priority
  if (context.validationResult && 
      context.validationResult.confidence > 70 && 
      context.validationResult.issues.length > 0) {
    return {
      responseText: `I noticed something that may need attention: ${context.validationResult.feedback}`,
      priority: 'validation',
      metadata: context.validationResult
    };
  }

  // High priority clarifications come next
  if (context.clarificationResult && 
      context.clarificationResult.priority === 'high' && 
      context.clarificationResult.questions.length > 0) {
    return {
      responseText: `To ensure I understand correctly: ${context.clarificationResult.questions[0]}`,
      priority: 'clarification',
      metadata: context.clarificationResult
    };
  }

  // Follow-up questions as default
  if (context.followUpResult && context.followUpResult.question) {
    return {
      responseText: context.followUpResult.question,
      priority: 'follow-up',
      metadata: context.followUpResult
    };
  }

  // Fallback
  return {
    responseText: "Thank you for that information. Could you tell me more about this procedure?",
    priority: 'follow-up',
    metadata: {}
  };
} 
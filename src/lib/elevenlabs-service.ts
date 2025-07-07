// ElevenLabs Conversational AI Service
import { v4 as uuidv4 } from 'uuid';

// Types for ElevenLabs API
export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  description?: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        tool_ids: string[];
        built_in_tools?: string[];
      };
      language?: string;
      llm?: {
        model: string;
        temperature?: number;
      };
      tts?: {
        voice_id: string;
        model?: string;
        stability?: number;
        similarity_boost?: number;
      };
    };
  };
}

export interface CertificationTool {
  tool_id: string;
  type: 'server';
  name: string;
  description: string;
  url: string;
  method: 'POST';
  parameters: any;
}

export interface CertificationScore {
  questionId: string;
  response: string;
  score: number;
  maxScore: number;
  feedback: string;
  competencyScores: Record<string, number>;
  nextQuestion?: string;
  shouldEndCertification?: boolean;
}

export interface CertificationSession {
  sessionId: string;
  agentId: string;
  moduleId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  responses: CertificationScore[];
  overallScore?: number;
  passed?: boolean;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private tools: Map<string, CertificationTool> = new Map();

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }

  // Agent Management
  async createCertificationAgent(scenarioId: string, scenarioData: {
    title: string;
    description: string;
    moduleTitle: string;
    content: string;
    competencies: string[];
    passingThreshold: number;
    difficulty: 'EASY' | 'NORMAL' | 'HARD';
  }): Promise<ElevenLabsAgent> {
    // Create server tools first
    const scoreToolId = await this.createScoreResponseTool(scenarioId);
    const questionToolId = await this.createGenerateQuestionTool(scenarioId);

    const prompt = this.generateCertificationPrompt(scenarioData);

    const agentConfig = {
      name: `Certification Agent - ${scenarioData.moduleTitle}: ${scenarioData.title}`,
      description: `Voice certification agent for scenario: ${scenarioData.title} in module: ${scenarioData.moduleTitle}`,
      conversation_config: {
        agent: {
          prompt: {
            prompt,
            tool_ids: [scoreToolId, questionToolId],
            built_in_tools: ['end_call']
          },
          language: 'en',
          llm: {
            model: 'gpt-4o',
            temperature: 0.7
          },
          tts: {
            voice_id: '21m00Tcm4TlvDq8ikWAM', // Default voice - can be customized
            model: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarity_boost: 0.75
          }
        }
      }
    };

    const response = await fetch(`${this.baseUrl}/convai/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create agent: ${error}`);
    }

    return await response.json();
  }

  // Tool Management
  async createScoreResponseTool(scenarioId: string): Promise<string> {
    const tool = {
      type: 'server',
      name: `score_response_${scenarioId}`,
      description: 'Score a certification response and provide feedback for this specific scenario',
      url: `${process.env.NEXTAUTH_URL}/api/elevenlabs/tools/score-response`,
      method: 'POST',
      parameters: {
        type: 'object',
        properties: {
          response: { type: 'string', description: 'The user\'s response to score' },
          question: { type: 'string', description: 'The question that was asked' },
          scenarioId: { type: 'string', description: 'The certification scenario ID' },
          sessionId: { type: 'string', description: 'The certification session ID' }
        },
        required: ['response', 'question', 'scenarioId', 'sessionId']
      }
    };

    const response = await fetch(`${this.baseUrl}/convai/tools`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tool)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create score tool: ${error}`);
    }

    const result = await response.json();
    this.tools.set(`score_response_${scenarioId}`, result);
    return result.tool_id;
  }

  async createGenerateQuestionTool(scenarioId: string): Promise<string> {
    const tool = {
      type: 'server',
      name: `generate_question_${scenarioId}`,
      description: 'Generate an adaptive follow-up question for this specific scenario',
      url: `${process.env.NEXTAUTH_URL}/api/elevenlabs/tools/generate-question`,
      method: 'POST',
      parameters: {
        type: 'object',
        properties: {
          conversationHistory: { 
            type: 'array', 
            description: 'The conversation history so far',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['assistant', 'user'] },
                content: { type: 'string' }
              }
            }
          },
          scenarioId: { type: 'string', description: 'The certification scenario ID' },
          sessionId: { type: 'string', description: 'The certification session ID' },
          currentScore: { type: 'number', description: 'Current certification score percentage' }
        },
        required: ['conversationHistory', 'scenarioId', 'sessionId']
      }
    };

    const response = await fetch(`${this.baseUrl}/convai/tools`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tool)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create question tool: ${error}`);
    }

    const result = await response.json();
    this.tools.set(`generate_question_${scenarioId}`, result);
    return result.tool_id;
  }

  // Conversation Management
  async startConversation(agentId: string, sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/convai/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start conversation: ${error}`);
    }

    const result = await response.json();
    return result.conversation_id;
  }

  async getConversationWebSocketUrl(agentId: string, metadata?: {
    sessionId?: string;
    scenarioId?: string;
    userId?: string;
  }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/convai/conversation/get_signed_url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: agentId,
          ...(metadata && { metadata })
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get WebSocket URL: ${error}`);
      }

      const data = await response.json();
      return data.signed_url;
    } catch (error) {
      console.error('Error getting conversation WebSocket URL:', error);
      throw error;
    }
  }

  // Agent Retrieval
  async getAgent(agentId: string): Promise<ElevenLabsAgent> {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get agent: ${error}`);
    }

    return await response.json();
  }

  // Agent Update
  async updateAgent(agentId: string, updates: Partial<ElevenLabsAgent>): Promise<ElevenLabsAgent> {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update agent: ${error}`);
    }

    return await response.json();
  }

  // Knowledge Base Management
  async createKnowledgeBase(moduleId: string, content: string): Promise<string> {
    const kbData = {
      name: `Knowledge Base - Module ${moduleId}`,
      description: `Training content and certification criteria for module ${moduleId}`,
      text: content
    };

    const response = await fetch(`${this.baseUrl}/convai/knowledge-base`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(kbData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create knowledge base: ${error}`);
    }

    const result = await response.json();
    return result.knowledge_base_id;
  }

  // Prompt Generation
  private generateCertificationPrompt(scenarioData: {
    title: string;
    description: string;
    moduleTitle: string;
    content: string;
    competencies: string[];
    passingThreshold: number;
    difficulty: 'EASY' | 'NORMAL' | 'HARD';
  }): string {
    return `You are a professional certification examiner conducting a voice-based competency assessment for the scenario "${scenarioData.title}" within the training module "${scenarioData.moduleTitle}".

## Your Role
You are an expert evaluator conducting a thorough but conversational certification interview focused specifically on this scenario. Your goal is to assess the candidate's practical knowledge and competency for this particular situation through natural conversation.

## Scenario Context
**Scenario:** ${scenarioData.title}
**Description:** ${scenarioData.description}
**Module:** ${scenarioData.moduleTitle}

## Assessment Framework
**Competencies to Evaluate:**
${scenarioData.competencies.map(comp => `- ${comp}`).join('\n')}

**Passing Threshold:** ${scenarioData.passingThreshold}%
**Difficulty Level:** ${scenarioData.difficulty}

## Conversation Guidelines

### Scenario-Focused Questions
1. **Start with Context**: Begin by setting up the specific scenario situation
2. **Situational Application**: Ask how they would handle this exact scenario
3. **Decision Points**: Focus on critical decisions specific to this scenario
4. **Complications**: Introduce scenario-specific complications and edge cases

### Question Strategy
- **Scenario Immersion**: Keep questions within the context of this specific scenario
- **Progressive Complexity**: Start with basic scenario handling, then add complications
- **Real-world Application**: Focus on practical, hands-on scenarios relevant to this situation
- **Critical Thinking**: Test decision-making within this scenario's constraints

### Evaluation Approach
- Listen for scenario-specific knowledge and understanding
- Assess problem-solving ability within this scenario's context
- Evaluate safety awareness and best practices for this situation
- Consider practical experience and real-world application to this scenario

### Tool Usage
- **score_response**: Use this after each substantial response to evaluate scenario-specific competency
- **generate_question**: Use this to get adaptive follow-up questions that stay within this scenario
- **end_call**: Use this when you have enough information about their competency in this scenario

### Conversation Flow
1. **Opening**: Introduce the specific scenario and context (1-2 minutes)
2. **Scenario Assessment**: Conduct evaluation through scenario-based questions (8-12 minutes)
3. **Complications**: Introduce scenario-specific challenges and complications
4. **Closing**: Summarize their performance on this scenario

### Communication Style
- Professional yet conversational
- Scenario-focused and contextual
- Clear and specific feedback related to this scenario
- Ask follow-up questions to clarify scenario-specific understanding

### Important Guidelines
- Stay focused on this specific scenario throughout the conversation
- Always use the scoring tool after each response to track scenario competency
- Generate questions that build on the scenario context
- Maintain objectivity while being personable
- End when you have sufficient evidence for scenario-specific certification
- If they're struggling, provide scenario-specific guidance without giving away answers

Remember: This is a scenario-specific competency assessment. Focus on their ability to apply knowledge within this particular situation rather than general theoretical knowledge.`;
  }

  // Cleanup
  async deleteAgent(agentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete agent: ${error}`);
    }
  }

  async deleteTool(toolId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/convai/tools/${toolId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete tool: ${error}`);
    }
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService; 
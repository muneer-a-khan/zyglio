/**
 * Streaming Agents Service
 * Handles OpenAI GPT-4o streaming calls for various agent types
 */

import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StreamingContext {
  transcript: string;
  procedureContext: string;
  conversationHistory: Array<{role: 'ai' | 'user', content: string}>;
  sessionId: string;
  topics?: any[];
}

export interface AgentStreamResult {
  agentType: string;
  content: string;
  isComplete: boolean;
  metadata?: any;
}

export type AgentStreamCallback = (result: AgentStreamResult) => void;

/**
 * Validation Agent - Streams fact-checking and accuracy validation
 */
export async function streamValidationAgent(
  context: StreamingContext,
  onStream: AgentStreamCallback
): Promise<void> {
  const systemPrompt = `You are an expert validation agent for procedural interviews. Your job is to identify potential inaccuracies, safety issues, or questionable statements in real-time.

Guidelines:
- Identify factual errors or potentially unsafe practices
- Note inconsistencies with standard procedures
- Flag missing critical safety steps
- Provide constructive feedback with confidence levels
- Be concise but specific

Respond in this format:
CONFIDENCE: [0-100]
ISSUES: [brief list of concerns]
FEEDBACK: [constructive feedback]`;

  const userPrompt = `Validate this transcript segment from a procedure interview:

Context: ${context.procedureContext}

Recent conversation:
${context.conversationHistory.slice(-3).map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Current transcript: ${context.transcript}

Provide real-time validation feedback:`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        onStream({
          agentType: 'validation',
          content: accumulatedContent,
          isComplete: false,
          metadata: { confidence: 0 }
        });
      }
    }

    // Parse final result for confidence and issues
    const confidence = extractConfidence(accumulatedContent);
    const issues = extractIssues(accumulatedContent);

    onStream({
      agentType: 'validation',
      content: accumulatedContent,
      isComplete: true,
      metadata: { confidence, issues }
    });

  } catch (error) {
    console.error('Validation agent streaming error:', error);
    onStream({
      agentType: 'validation',
      content: 'Validation temporarily unavailable',
      isComplete: true,
      metadata: { confidence: 0, issues: [] }
    });
  }
}

/**
 * Clarification Agent - Streams clarification questions
 */
export async function streamClarificationAgent(
  context: StreamingContext,
  onStream: AgentStreamCallback
): Promise<void> {
  const systemPrompt = `You are an expert clarification agent for procedural interviews. Your job is to identify gaps, ambiguities, or areas needing more detail in real-time.

Guidelines:
- Identify unclear or vague statements
- Note missing critical details
- Suggest specific clarifying questions
- Prioritize safety-critical clarifications
- Be conversational and natural

Respond in this format:
PRIORITY: [high/medium/low]
GAPS: [list of information gaps]
QUESTIONS: [specific clarifying questions]`;

  const userPrompt = `Analyze this transcript for clarification needs:

Context: ${context.procedureContext}

Recent conversation:
${context.conversationHistory.slice(-3).map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Current transcript: ${context.transcript}

What clarifications are needed?`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 400,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        onStream({
          agentType: 'clarification',
          content: accumulatedContent,
          isComplete: false,
          metadata: {}
        });
      }
    }

    const priority = extractPriority(accumulatedContent);
    const questions = extractQuestions(accumulatedContent);

    onStream({
      agentType: 'clarification',
      content: accumulatedContent,
      isComplete: true,
      metadata: { priority, questions }
    });

  } catch (error) {
    console.error('Clarification agent streaming error:', error);
    onStream({
      agentType: 'clarification',
      content: 'Clarification analysis temporarily unavailable',
      isComplete: true,
      metadata: { priority: 'low', questions: [] }
    });
  }
}

/**
 * Follow-up Agent - Streams follow-up questions
 */
export async function streamFollowUpAgent(
  context: StreamingContext,
  onStream: AgentStreamCallback
): Promise<void> {
  const systemPrompt = `You are an expert follow-up agent for procedural interviews. Your job is to generate thoughtful follow-up questions that deepen understanding.

Guidelines:
- Generate questions that explore deeper details
- Focus on practical applications and edge cases
- Ask about decision-making processes
- Explore alternative approaches
- Be engaging and conversational

Respond in this format:
CATEGORY: [exploration/detail/alternatives/safety]
REASONING: [why this follow-up is valuable]
QUESTION: [specific follow-up question]`;

  const userPrompt = `Generate a follow-up question based on this transcript:

Context: ${context.procedureContext}

Recent conversation:
${context.conversationHistory.slice(-3).map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Current transcript: ${context.transcript}

What's the best follow-up question to deepen understanding?`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 300,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        onStream({
          agentType: 'follow-up',
          content: accumulatedContent,
          isComplete: false,
          metadata: {}
        });
      }
    }

    const category = extractCategory(accumulatedContent);
    const reasoning = extractReasoning(accumulatedContent);
    const question = extractQuestion(accumulatedContent);

    onStream({
      agentType: 'follow-up',
      content: accumulatedContent,
      isComplete: true,
      metadata: { category, reasoning, question }
    });

  } catch (error) {
    console.error('Follow-up agent streaming error:', error);
    onStream({
      agentType: 'follow-up',
      content: 'Follow-up generation temporarily unavailable',
      isComplete: true,
      metadata: { category: 'general', reasoning: '', question: '' }
    });
  }
}

/**
 * Topic Analysis Agent - Streams topic coverage analysis
 */
export async function streamTopicAnalysisAgent(
  context: StreamingContext,
  onStream: AgentStreamCallback
): Promise<void> {
  const systemPrompt = `You are an expert topic analysis agent. Your job is to analyze how well current transcript covers required procedure topics.

Guidelines:
- Identify which topics are being discussed
- Assess depth of coverage (brief/thorough)
- Note missing critical topics
- Track knowledge gaps
- Provide coverage scores

Respond in this format:
TOPICS_COVERED: [list of topics discussed]
COVERAGE_DEPTH: [brief/moderate/thorough for each]
MISSING_TOPICS: [critical topics not yet covered]
SUGGESTIONS: [what to explore next]`;

  const userPrompt = `Analyze topic coverage in this transcript:

Context: ${context.procedureContext}

Required topics: ${context.topics?.map(t => t.name).join(', ') || 'General procedure topics'}

Recent conversation:
${context.conversationHistory.slice(-3).map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Current transcript: ${context.transcript}

Analyze topic coverage:`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 400,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        onStream({
          agentType: 'topic-analysis',
          content: accumulatedContent,
          isComplete: false,
          metadata: {}
        });
      }
    }

    const topicsCovered = extractTopicsCovered(accumulatedContent);
    const coverageDepth = extractCoverageDepth(accumulatedContent);
    const missingTopics = extractMissingTopics(accumulatedContent);

    onStream({
      agentType: 'topic-analysis',
      content: accumulatedContent,
      isComplete: true,
      metadata: { topicsCovered, coverageDepth, missingTopics }
    });

  } catch (error) {
    console.error('Topic analysis agent streaming error:', error);
    onStream({
      agentType: 'topic-analysis',
      content: 'Topic analysis temporarily unavailable',
      isComplete: true,
      metadata: { topicsCovered: [], coverageDepth: {}, missingTopics: [] }
    });
  }
}

/**
 * Topic Discovery Agent - Streams new topic discovery
 */
export async function streamTopicDiscoveryAgent(
  context: StreamingContext,
  onStream: AgentStreamCallback
): Promise<void> {
  const systemPrompt = `You are an expert topic discovery agent. Your job is to identify new procedural topics or subtopics mentioned that weren't initially planned.

Guidelines:
- Identify new concepts, techniques, or considerations
- Classify as required vs optional for teaching
- Note emerging themes or patterns
- Suggest topic additions to curriculum
- Focus on educational value

Respond in this format:
NEW_TOPICS: [list of newly identified topics]
CLASSIFICATION: [required/optional for each]
EDUCATIONAL_VALUE: [why each topic matters]
RECOMMENDATIONS: [how to incorporate into training]`;

  const userPrompt = `Discover new topics in this transcript:

Context: ${context.procedureContext}

Known topics: ${context.topics?.map(t => t.name).join(', ') || 'None defined yet'}

Recent conversation:
${context.conversationHistory.slice(-3).map(entry => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n')}

Current transcript: ${context.transcript}

What new topics or concepts are emerging?`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 400,
      stream: true,
    });

    let accumulatedContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        accumulatedContent += delta;
        
        onStream({
          agentType: 'topic-discovery',
          content: accumulatedContent,
          isComplete: false,
          metadata: {}
        });
      }
    }

    const newTopics = extractNewTopics(accumulatedContent);
    const classifications = extractClassifications(accumulatedContent);
    const recommendations = extractRecommendations(accumulatedContent);

    onStream({
      agentType: 'topic-discovery',
      content: accumulatedContent,
      isComplete: true,
      metadata: { newTopics, classifications, recommendations }
    });

  } catch (error) {
    console.error('Topic discovery agent streaming error:', error);
    onStream({
      agentType: 'topic-discovery',
      content: 'Topic discovery temporarily unavailable',
      isComplete: true,
      metadata: { newTopics: [], classifications: {}, recommendations: [] }
    });
  }
}

// Utility functions for parsing agent responses
function extractConfidence(content: string): number {
  const match = content.match(/CONFIDENCE:\s*(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

function extractIssues(content: string): string[] {
  const match = content.match(/ISSUES:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(',').map(s => s.trim()) : [];
}

function extractPriority(content: string): 'high' | 'medium' | 'low' {
  const match = content.match(/PRIORITY:\s*(high|medium|low)/i);
  return match ? match[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
}

function extractQuestions(content: string): string[] {
  const match = content.match(/QUESTIONS:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(/\d+\.|\n-/).map(s => s.trim()).filter(s => s) : [];
}

function extractCategory(content: string): string {
  const match = content.match(/CATEGORY:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : 'general';
}

function extractReasoning(content: string): string {
  const match = content.match(/REASONING:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].trim() : '';
}

function extractQuestion(content: string): string {
  const match = content.match(/QUESTION:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].trim() : '';
}

function extractTopicsCovered(content: string): string[] {
  const match = content.match(/TOPICS_COVERED:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(',').map(s => s.trim()) : [];
}

function extractCoverageDepth(content: string): Record<string, string> {
  const match = content.match(/COVERAGE_DEPTH:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  // Simple parsing - could be enhanced
  return match ? {} : {};
}

function extractMissingTopics(content: string): string[] {
  const match = content.match(/MISSING_TOPICS:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(',').map(s => s.trim()) : [];
}

function extractNewTopics(content: string): string[] {
  const match = content.match(/NEW_TOPICS:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(',').map(s => s.trim()) : [];
}

function extractClassifications(content: string): Record<string, string> {
  const match = content.match(/CLASSIFICATION:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  // Simple parsing - could be enhanced
  return match ? {} : {};
}

function extractRecommendations(content: string): string[] {
  const match = content.match(/RECOMMENDATIONS:\s*(.+?)(?=\n[A-Z]+:|$)/is);
  return match ? match[1].split(/\d+\.|\n-/).map(s => s.trim()).filter(s => s) : [];
} 
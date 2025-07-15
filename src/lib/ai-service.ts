/**
 * AI Enhancement Service using DeepSeek AI
 * Provides intelligent content generation, scenario optimization, and learning enhancements
 */

import { SmartObject, ScenarioStep, Trigger, EnhancedLearningTask } from '@/types/unified';

export interface AIEnhancementOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ScenarioEnhancement {
  improvedSteps: ScenarioStep[];
  suggestedTriggers: Trigger[];
  learningObjectives: string[];
  difficultyRating: number;
  estimatedDuration: number;
  recommendations: string[];
}

export interface ObjectEnhancement {
  suggestedStates: string[];
  suggestedBehaviors: string[];
  suggestedSignals: string[];
  improvedAttributes: Record<string, any>;
  usageRecommendations: string[];
}

export interface ContentGeneration {
  generatedText: string;
  alternatives: string[];
  tone: 'formal' | 'casual' | 'instructional' | 'conversational';
  confidence: number;
}

export interface LearningAnalysis {
  knowledgeGaps: string[];
  suggestedPrerequisites: string[];
  adaptiveDifficulty: number;
  personalizedRecommendations: string[];
  progressPrediction: {
    estimatedCompletionTime: number;
    successProbability: number;
    potentialChallenges: string[];
  };
}

class AIService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found. AI features will not work.');
    }
  }

  /**
   * Generate completion using DeepSeek API
   */
  private async generateCompletion(
    prompt: string,
    options: AIEnhancementOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const defaultOptions = {
      temperature: 0.7,
      maxTokens: 2000,
      model: 'deepseek-chat'
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Connection': 'keep-alive'
        },
        signal: AbortSignal.timeout(15000), // 15-second timeout
        body: JSON.stringify({
          model: requestOptions.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert educational technology specialist and training scenario designer. 
              You understand learning theory, instructional design, and interactive simulation development.
              Always provide practical, actionable suggestions that enhance learning outcomes.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: requestOptions.temperature,
          max_tokens: requestOptions.maxTokens,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI completion failed:', error);
      throw error;
    }
  }

  /**
   * Enhance scenario with AI suggestions
   */
  public async enhanceScenario(
    objects: SmartObject[],
    steps: ScenarioStep[],
    learningObjectives: string[] = []
  ): Promise<ScenarioEnhancement> {
    const prompt = `
    Analyze and enhance this training scenario:

    OBJECTS AVAILABLE:
    ${objects.map(obj => `- ${obj.name} (${obj.category}): States: ${obj.states.join(', ')}, Behaviors: ${obj.behaviors.join(', ')}`).join('\n')}

    CURRENT SCENARIO STEPS:
    ${steps.map((step, i) => `${i + 1}. ${step.instruction} (Required objects: ${step.requiredObjects.length})`).join('\n')}

    LEARNING OBJECTIVES:
    ${learningObjectives.join('\n- ')}

    Please provide:
    1. Improved step instructions that are clearer and more engaging
    2. Suggested new triggers for object interactions
    3. Enhanced learning objectives based on the scenario
    4. Difficulty rating (1-10)
    5. Estimated completion time in minutes
    6. Specific recommendations for improvement

    Format your response as valid JSON with these exact keys:
    {
      "improvedSteps": [...],
      "suggestedTriggers": [...],
      "learningObjectives": [...],
      "difficultyRating": number,
      "estimatedDuration": number,
      "recommendations": [...]
    }
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.8 });
      const enhancement = JSON.parse(response);
      
      // Validate and transform the response
      return {
        improvedSteps: enhancement.improvedSteps || steps,
        suggestedTriggers: enhancement.suggestedTriggers || [],
        learningObjectives: enhancement.learningObjectives || learningObjectives,
        difficultyRating: enhancement.difficultyRating || 5,
        estimatedDuration: enhancement.estimatedDuration || 30,
        recommendations: enhancement.recommendations || []
      };
    } catch (error) {
      console.error('Scenario enhancement failed:', error);
      // Return safe defaults
      return {
        improvedSteps: steps,
        suggestedTriggers: [],
        learningObjectives,
        difficultyRating: 5,
        estimatedDuration: 30,
        recommendations: ['Unable to generate AI recommendations at this time.']
      };
    }
  }

  /**
   * Enhance object definition with AI suggestions
   */
  public async enhanceObject(object: SmartObject): Promise<ObjectEnhancement> {
    const prompt = `
    Analyze this smart object and suggest enhancements:

    OBJECT: ${object.name}
    CATEGORY: ${object.category}
    CURRENT STATES: ${object.states.join(', ')}
    CURRENT BEHAVIORS: ${object.behaviors.join(', ')}
    CURRENT SIGNALS: ${object.signals.join(', ')}
    ATTRIBUTES: ${JSON.stringify(object.attributes)}

    Please suggest:
    1. Additional realistic states this object could have
    2. More behaviors/actions users could perform with this object
    3. Useful signals this object could emit
    4. Enhanced attributes with better descriptions
    5. Best practices for using this object in training scenarios

    Format as JSON:
    {
      "suggestedStates": [...],
      "suggestedBehaviors": [...],
      "suggestedSignals": [...],
      "improvedAttributes": {...},
      "usageRecommendations": [...]
    }
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.7 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Object enhancement failed:', error);
      return {
        suggestedStates: [],
        suggestedBehaviors: [],
        suggestedSignals: [],
        improvedAttributes: object.attributes,
        usageRecommendations: []
      };
    }
  }

  /**
   * Generate content with AI assistance
   */
  public async generateContent(
    type: 'instruction' | 'feedback' | 'description' | 'explanation',
    context: string,
    tone: 'formal' | 'casual' | 'instructional' | 'conversational' = 'instructional'
  ): Promise<ContentGeneration> {
    const toneGuides = {
      formal: 'Use professional, authoritative language suitable for corporate training',
      casual: 'Use friendly, approachable language that feels conversational',
      instructional: 'Use clear, step-by-step language that guides learners effectively',
      conversational: 'Use natural, engaging language that feels like talking to a helpful teacher'
    };

    const prompt = `
    Generate ${type} content for a training scenario.
    
    CONTEXT: ${context}
    TONE: ${tone} - ${toneGuides[tone]}
    
    Requirements:
    - Keep it concise but informative
    - Make it engaging and actionable
    - Ensure clarity for learners
    - Include specific details when helpful
    
    Provide the main content plus 2-3 alternative versions.
    
    Format as JSON:
    {
      "generatedText": "main version",
      "alternatives": ["alt1", "alt2", "alt3"],
      "tone": "${tone}",
      "confidence": 0.95
    }
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.8 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Content generation failed:', error);
      return {
        generatedText: context,
        alternatives: [],
        tone,
        confidence: 0.1
      };
    }
  }

  /**
   * Analyze learning progress and provide personalized recommendations
   */
  public async analyzeLearningProgress(
    learner: {
      completedTasks: number;
      averageScore: number;
      timeSpent: number;
      strugglingAreas: string[];
    },
    currentTask: EnhancedLearningTask
  ): Promise<LearningAnalysis> {
    const prompt = `
    Analyze this learner's progress and provide personalized recommendations:

    LEARNER PROFILE:
    - Completed tasks: ${learner.completedTasks}
    - Average score: ${learner.averageScore}%
    - Total time spent: ${learner.timeSpent} minutes
    - Struggling areas: ${learner.strugglingAreas.join(', ')}

    CURRENT TASK:
    - Title: ${currentTask.title}
    - Description: ${currentTask.description || 'Not specified'}

    Provide:
    1. Identified knowledge gaps
    2. Suggested prerequisites or review topics
    3. Adaptive difficulty adjustment (1-10 scale)
    4. Personalized learning recommendations
    5. Progress prediction with estimated completion time and success probability
    6. Potential challenges this learner might face

    Format as JSON:
    {
      "knowledgeGaps": [...],
      "suggestedPrerequisites": [...],
      "adaptiveDifficulty": number,
      "personalizedRecommendations": [...],
      "progressPrediction": {
        "estimatedCompletionTime": number,
        "successProbability": number,
        "potentialChallenges": [...]
      }
    }
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.6 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Learning analysis failed:', error);
      return {
        knowledgeGaps: [],
        suggestedPrerequisites: [],
        adaptiveDifficulty: 5,
        personalizedRecommendations: [],
        progressPrediction: {
          estimatedCompletionTime: 30,
          successProbability: 0.7,
          potentialChallenges: []
        }
      };
    }
  }

  /**
   * Generate intelligent trigger suggestions based on scenario context
   */
  public async suggestTriggers(
    objects: SmartObject[],
    scenarioSteps: ScenarioStep[]
  ): Promise<Trigger[]> {
    const prompt = `
    Suggest intelligent triggers for this training scenario:

    AVAILABLE OBJECTS:
    ${objects.map(obj => `- ${obj.name}: States[${obj.states.join(', ')}], Behaviors[${obj.behaviors.join(', ')}], Signals[${obj.signals.join(', ')}]`).join('\n')}

    SCENARIO FLOW:
    ${scenarioSteps.map((step, i) => `Step ${i + 1}: ${step.instruction}`).join('\n')}

    Generate 3-5 useful triggers that would:
    1. Enhance interactivity
    2. Provide meaningful feedback
    3. Create realistic cause-and-effect relationships
    4. Support learning objectives

    For each trigger, specify:
    - objectId (must match an existing object)
    - signal (what triggers it)
    - condition (when it should fire)
    - action (what happens)

    Format as JSON array of trigger objects.
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.7 });
      const suggestedTriggers = JSON.parse(response);
      
      // Validate that objectIds exist
      return suggestedTriggers.filter((trigger: any) =>
        objects.some(obj => obj.id === trigger.objectId)
      );
    } catch (error) {
      console.error('Trigger suggestion failed:', error);
      return [];
    }
  }

  /**
   * Generate learning objectives based on scenario content
   */
  public async generateLearningObjectives(
    objects: SmartObject[],
    scenarioSteps: ScenarioStep[],
    domain: string = 'general'
  ): Promise<string[]> {
    const prompt = `
    Generate specific, measurable learning objectives for this training scenario:

    DOMAIN: ${domain}
    
    OBJECTS INVOLVED:
    ${objects.map(obj => `- ${obj.name} (${obj.category})`).join('\n')}

    SCENARIO ACTIVITIES:
    ${scenarioSteps.map((step, i) => `${i + 1}. ${step.instruction}`).join('\n')}

    Generate 3-5 learning objectives that:
    1. Use action verbs (demonstrate, identify, perform, analyze, etc.)
    2. Are specific and measurable
    3. Align with the scenario activities
    4. Follow Bloom's taxonomy levels
    5. Are appropriate for the complexity of the scenario

    Return as a JSON array of strings.
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.6 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Learning objectives generation failed:', error);
      return [
        'Complete all scenario steps successfully',
        'Demonstrate understanding of object interactions',
        'Apply learned procedures in practical situations'
      ];
    }
  }

  /**
   * Optimize scenario flow for better learning outcomes
   */
  public async optimizeScenarioFlow(
    steps: ScenarioStep[],
    learningObjectives: string[]
  ): Promise<{
    optimizedSteps: ScenarioStep[];
    reasoning: string[];
    improvements: string[];
  }> {
    const prompt = `
    Optimize this scenario flow for better learning outcomes:

    CURRENT STEPS:
    ${steps.map((step, i) => `${i + 1}. ${step.instruction} (Checkpoint: ${step.isCheckpoint})`).join('\n')}

    LEARNING OBJECTIVES:
    ${learningObjectives.join('\n- ')}

    Analyze and optimize for:
    1. Logical progression from simple to complex
    2. Appropriate checkpoint placement
    3. Clear instruction language
    4. Engaging and interactive elements
    5. Alignment with learning objectives

    Provide:
    - Optimized step order and instructions
    - Reasoning for changes made
    - Specific improvements implemented

    Format as JSON:
    {
      "optimizedSteps": [...],
      "reasoning": [...],
      "improvements": [...]
    }
    `;

    try {
      const response = await this.generateCompletion(prompt, { temperature: 0.7 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Scenario optimization failed:', error);
      return {
        optimizedSteps: steps,
        reasoning: ['Unable to optimize scenario at this time'],
        improvements: []
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

// All types are already exported as regular exports above 
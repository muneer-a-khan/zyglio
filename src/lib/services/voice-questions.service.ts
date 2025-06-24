import { prisma } from '../../lib/prisma';
import { getDeepSeekApi } from '../../lib/deepseek';

export class VoiceQuestionsService {
  /**
   * Generate voice certification questions for a module and store them in the question bank
   * This can be called in the background when a module is created or updated
   */
  static async generateQuestionsForModule(moduleId: string, force: boolean = false): Promise<boolean> {
    try {
      // Get the module with procedure
      const module = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        include: {
          procedure: true,
          voiceQuestionBanks: true
        }
      });

      if (!module) {
        console.error(`Module not found: ${moduleId}`);
        return false;
      }

      // Generate questions for each difficulty level
      const difficulties = ['EASY', 'NORMAL', 'HARD'];
      let generatedCount = 0;

      for (const difficulty of difficulties) {
        // Check if questions already exist for this difficulty
        const existingBank = module.voiceQuestionBanks.find(bank => bank.difficulty === difficulty);
        
        if (existingBank && !force) {
          console.log(`Questions already exist for module ${moduleId} with difficulty ${difficulty}`);
          continue;
        }

        // Generate questions using DeepSeek
        const questions = await this.generateQuestionsWithDeepSeek(module, difficulty);
        
        if (questions.length === 0) {
          console.error(`Failed to generate questions for module ${moduleId} with difficulty ${difficulty}`);
          continue;
        }

        // Save or update the question bank
        if (existingBank) {
          await prisma.voiceQuestionBank.update({
            where: { id: existingBank.id },
            data: {
              questions,
              updatedAt: new Date()
            }
          });
        } else {
          await prisma.voiceQuestionBank.create({
            data: {
              moduleId,
              difficulty,
              questions
            }
          });
        }

        generatedCount++;
      }

      return generatedCount > 0;
    } catch (error) {
      console.error('Error generating questions for module:', error);
      return false;
    }
  }

  /**
   * Get questions for a certification session
   */
  static async getQuestionsForCertification(moduleId: string, difficulty: string): Promise<any[]> {
    try {
      // Try to get questions from the bank
      const questionBank = await prisma.voiceQuestionBank.findFirst({
        where: {
          moduleId,
          difficulty
        }
      });

      if (questionBank && Array.isArray(questionBank.questions)) {
        console.log(`Found ${questionBank.questions.length} questions in bank for module ${moduleId} with difficulty ${difficulty}`);
        return questionBank.questions as any[];
      }

      // If no questions in bank, generate them now
      console.log(`No questions found in bank for module ${moduleId} with difficulty ${difficulty}. Generating...`);
      
      const module = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        include: {
          procedure: true
        }
      });

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      const questions = await this.generateQuestionsWithDeepSeek(module, difficulty);
      
      // Save the questions for future use
      await prisma.voiceQuestionBank.create({
        data: {
          moduleId,
          difficulty,
          questions
        }
      });

      return questions;
    } catch (error) {
      console.error('Error getting questions for certification:', error);
      
      // Return fallback questions if all else fails
      const module = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        include: {
          procedure: true
        }
      });
      
      if (!module) {
        return this.generateFallbackQuestions({ title: 'Unknown Module' }, difficulty);
      }
      
      return this.generateFallbackQuestions(module, difficulty);
    }
  }

  /**
   * Generate questions using DeepSeek API
   */
  private static async generateQuestionsWithDeepSeek(module: any, difficulty: string): Promise<any[]> {
    try {
      const deepseekApi = getDeepSeekApi();
      const subtopics = Array.isArray(module.subtopics) ? module.subtopics.map((t: any) => t.title || t).join(', ') : '';

      const questionPrompt = `
Generate voice interview questions for certification in: ${module.title}

Procedure: ${module.procedure?.title || 'Unknown Procedure'}
Subtopics: ${subtopics}
Interview Difficulty: ${difficulty}
Interview Duration: ~15 minutes

Generate 15-20 questions of varying difficulty that cover all key competency areas:
1. Factual knowledge questions
2. Scenario-based questions  
3. Safety and compliance questions
4. Problem-solving questions
5. Best practices questions

Format as JSON array with this structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "factual|scenario|safety|problem_solving|best_practice",
      "difficulty": "${difficulty.toLowerCase()}",
      "question": "Question text here?",
      "expectedKeywords": ["keyword1", "keyword2"],
      "competencyArea": "specific area",
      "points": 5,
      "scoringCriteria": {
        "excellent": "Criteria for 5 points",
        "good": "Criteria for 3-4 points", 
        "adequate": "Criteria for 2 points",
        "poor": "Criteria for 1 point"
      }
    }
  ]
}
`;

      const questionsResponse = await deepseekApi.chat.completions.create({
        messages: [{ role: 'user', content: questionPrompt }],
        model: 'deepseek-chat',
        response_format: { type: 'json_object' }
      });
      
      const responseContent = questionsResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from DeepSeek API');
      }
      
      const parsedResponse = JSON.parse(responseContent);
      return parsedResponse.questions || [];
    } catch (error) {
      console.error('Error generating questions with DeepSeek:', error);
      return this.generateFallbackQuestions(module, difficulty);
    }
  }

  /**
   * Generate fallback questions if DeepSeek fails
   */
  private static generateFallbackQuestions(module: any, difficulty: string): any[] {
    const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
    const difficultyLower = difficulty.toLowerCase();
    
    const questions = [
      {
        id: 'q1',
        type: 'factual',
        difficulty: difficultyLower,
        question: `Can you explain the main purpose of the ${module.title} procedure?`,
        expectedKeywords: ['procedure', 'purpose', 'objective'],
        competencyArea: 'Basic Understanding',
        points: 5,
        scoringCriteria: {
          excellent: 'Clear explanation with all key points',
          good: 'Good explanation with most key points',
          adequate: 'Basic explanation with some key points',
          poor: 'Incomplete or unclear explanation'
        }
      },
      {
        id: 'q2', 
        type: 'scenario',
        difficulty: difficultyLower,
        question: `Describe a situation where you would need to follow this procedure and walk me through the key steps.`,
        expectedKeywords: ['steps', 'process', 'sequence'],
        competencyArea: 'Practical Application',
        points: 8,
        scoringCriteria: {
          excellent: 'Comprehensive scenario with correct steps',
          good: 'Good scenario with mostly correct steps',
          adequate: 'Basic scenario with some correct steps',
          poor: 'Unclear scenario or incorrect steps'
        }
      },
      {
        id: 'q3',
        type: 'safety',
        difficulty: difficultyLower,
        question: 'What safety considerations should be kept in mind when following this procedure?',
        expectedKeywords: ['safety', 'precautions', 'risks'],
        competencyArea: 'Safety Awareness',
        points: 7,
        scoringCriteria: {
          excellent: 'Identifies all major safety considerations',
          good: 'Identifies most safety considerations',
          adequate: 'Identifies basic safety considerations',
          poor: 'Limited or no safety awareness'
        }
      }
    ];

    // Add more questions based on subtopics
    subtopics.forEach((subtopic: any, index: number) => {
      if (index < 5) { // Limit to 5 additional questions
        questions.push({
          id: `q${questions.length + 1}`,
          type: 'factual',
          difficulty: difficultyLower,
          question: `Tell me about ${subtopic.title || subtopic} and its importance in this procedure.`,
          expectedKeywords: [subtopic.title || subtopic, 'importance', 'role'],
          competencyArea: subtopic.title || subtopic,
          points: 5,
          scoringCriteria: {
            excellent: 'Thorough understanding and explanation',
            good: 'Good understanding with minor gaps',
            adequate: 'Basic understanding',
            poor: 'Limited or incorrect understanding'
          }
        });
      }
    });

    return questions;
  }
} 
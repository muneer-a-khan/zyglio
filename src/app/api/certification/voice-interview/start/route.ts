import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deepseekApi } from '@/lib/deepseek';

export async function POST(request: NextRequest) {
  try {
    const { userId, moduleId } = await request.json();

    if (!userId || !moduleId) {
      return NextResponse.json(
        { error: 'User ID and Module ID are required' },
        { status: 400 }
      );
    }

    // Get training module and user's quiz performance
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        procedure: true,
        quizBanks: {
          include: {
            attempts: {
              where: { userId },
              orderBy: { completedAt: 'desc' }
            }
          }
        }
      }
    });

    if (!module) {
      return NextResponse.json(
        { error: 'Training module not found' },
        { status: 404 }
      );
    }

    // Check if user has completed all quizzes
    const requiredQuizzes = module.quizBanks.length;
    const passedQuizzes = module.quizBanks.filter(quiz => 
      quiz.attempts.some(attempt => attempt.passed)
    ).length;

    if (passedQuizzes < requiredQuizzes) {
      return NextResponse.json(
        { error: 'Must complete all quizzes before voice certification' },
        { status: 400 }
      );
    }

    // Calculate average quiz score to determine interview difficulty
    const allPassed = module.quizBanks.map(quiz => 
      quiz.attempts.find(attempt => attempt.passed)
    ).filter(Boolean);
    
    const averageScore = allPassed.length > 0 
      ? Math.round(allPassed.reduce((sum, attempt) => sum + (attempt?.score || 0), 0) / allPassed.length)
      : 0;

    // Determine adaptive difficulty and passing threshold
    let adaptiveDifficulty = 'NORMAL';
    let passingThreshold = 70;
    
    if (averageScore >= 90) {
      adaptiveDifficulty = 'HARD';
      passingThreshold = 60; // Easier passing for harder questions
    } else if (averageScore >= 80) {
      adaptiveDifficulty = 'NORMAL';
      passingThreshold = 70;
    } else {
      adaptiveDifficulty = 'EASY';
      passingThreshold = 75; // Higher passing for easier questions
    }

    // Create or update certification record
    const certification = await prisma.certification.upsert({
      where: {
        userId_moduleId: {
          userId,
          moduleId
        }
      },
      update: {
        status: 'VOICE_INTERVIEW_IN_PROGRESS',
        quizScore: averageScore,
        adaptiveDifficulty,
        voiceInterviewData: {
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore
        }
      },
      create: {
        userId,
        moduleId,
        procedureId: module.procedureId,
        status: 'VOICE_INTERVIEW_IN_PROGRESS',
        quizScore: averageScore,
        adaptiveDifficulty,
        voiceInterviewData: {
          startedAt: new Date().toISOString(),
          passingThreshold,
          averageQuizScore: averageScore
        }
      }
    });

    // Generate interview questions using DeepSeek
    const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
    const questionPrompt = `
Generate voice interview questions for certification in: ${module.title}

Procedure: ${module.procedure.title}
Subtopics: ${subtopics.map((t: any) => t.title || t).join(', ')}
User's Quiz Performance: ${averageScore}% average
Interview Difficulty: ${adaptiveDifficulty}
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
      "difficulty": "easy|medium|hard",
      "question": "Question text here?",
      "expectedKeywords": ["keyword1", "keyword2"],
      "competencyArea": "specific area",
      "points": 5,
      "followUpQuestions": ["Optional follow-up question"],
      "scoringCriteria": {
        "excellent": "Criteria for 5 points",
        "good": "Criteria for 3-4 points", 
        "adequate": "Criteria for 2 points",
        "poor": "Criteria for 1 point"
      }
    }
  ]
}

Adjust question difficulty based on ${adaptiveDifficulty} level.
`;

    try {
      const questionsResponse = await deepseekApi(questionPrompt);
      let interviewQuestions;
      
      try {
        interviewQuestions = JSON.parse(questionsResponse);
      } catch {
        // Fallback questions if parsing fails
        interviewQuestions = generateFallbackQuestions(module, adaptiveDifficulty);
      }

      // Update certification with generated questions
      await prisma.certification.update({
        where: { id: certification.id },
        data: {
          voiceInterviewData: {
            ...certification.voiceInterviewData,
            questions: interviewQuestions.questions,
            currentQuestionIndex: 0,
            responses: []
          }
        }
      });

      // Log analytics
      await prisma.certificationAnalytics.create({
        data: {
          certificationId: certification.id,
          userId,
          moduleId,
          eventType: 'VOICE_INTERVIEW_STARTED',
          eventData: {
            adaptiveDifficulty,
            passingThreshold,
            averageQuizScore: averageScore,
            questionsGenerated: interviewQuestions.questions.length
          }
        }
      }).catch(() => {
        console.warn('Failed to log analytics');
      });

      return NextResponse.json({
        success: true,
        certification: {
          id: certification.id,
          status: certification.status,
          adaptiveDifficulty,
          passingThreshold,
          estimatedDuration: 15,
          totalQuestions: interviewQuestions.questions.length,
          currentQuestion: interviewQuestions.questions[0]
        }
      });

    } catch (error) {
      console.error('Error generating interview questions:', error);
      
      // Create certification with fallback questions
      const fallbackQuestions = generateFallbackQuestions(module, adaptiveDifficulty);
      
      await prisma.certification.update({
        where: { id: certification.id },
        data: {
          voiceInterviewData: {
            ...certification.voiceInterviewData,
            questions: fallbackQuestions.questions,
            currentQuestionIndex: 0,
            responses: []
          }
        }
      });

      return NextResponse.json({
        success: true,
        certification: {
          id: certification.id,
          status: certification.status,
          adaptiveDifficulty,
          passingThreshold,
          estimatedDuration: 15,
          totalQuestions: fallbackQuestions.questions.length,
          currentQuestion: fallbackQuestions.questions[0]
        }
      });
    }

  } catch (error) {
    console.error('Error starting voice interview:', error);
    return NextResponse.json(
      { error: 'Failed to start voice interview' },
      { status: 500 }
    );
  }
}

function generateFallbackQuestions(module: any, difficulty: string) {
  const subtopics = Array.isArray(module.subtopics) ? module.subtopics : [];
  
  const questions = [
    {
      id: 'q1',
      type: 'factual',
      difficulty: difficulty.toLowerCase(),
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
      difficulty: difficulty.toLowerCase(),
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
      difficulty: difficulty.toLowerCase(),
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
        difficulty: difficulty.toLowerCase(),
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

  return { questions };
} 
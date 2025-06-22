import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { 
  getSessionData, 
  setSessionData, 
  initializeSession,
  generateBatchedQuestions,
  getTopicsByCategory,
  getTopicCoverageStats
} from '@/lib/session-service';
import OpenAI from 'openai';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedureId, initialContext, procedureTitle } = await request.json();

    if (!procedureId) {
      return NextResponse.json({ error: 'Procedure ID is required' }, { status: 400 });
    }

    // Get enhanced context if available, otherwise use initial context
    const contextToUse = await getEnhancedContextIfAvailable(procedureId, initialContext);

    // Get or initialize session
    let sessionData = await getSessionData(procedureId);
    if (!sessionData) {
      console.log('No existing session found, initializing new session for procedure:', procedureId);
      sessionData = await initializeSession(procedureId, contextToUse, procedureTitle || 'Unknown Procedure');
    } else {
      console.log('Found existing session for procedure:', procedureId, 'with', sessionData.questionsAsked, 'questions asked');
      
      // Update session context if enhanced context is now available
      if (contextToUse !== initialContext && sessionData.initialContext !== contextToUse) {
        sessionData.initialContext = contextToUse;
        await setSessionData(procedureId, sessionData);
        console.log('Updated session context with enhanced media content');
      }
    }

    // Generate first question if this is the start
    if (sessionData.questionsAsked === 0) {
      // Create the first question - "Tell me about X" format
      const customFirstQuestion = generateCustomFirstQuestion(procedureTitle, contextToUse);
      
      console.log('Generated first question:', customFirstQuestion);

      // Generate initial batch of questions using enhanced context
      const batchedQuestions = await generateBatchedQuestions(
        procedureTitle,
        contextToUse,
        [],
        sessionData.topics,
        5
      );

      sessionData.batchedQuestions = batchedQuestions;
      sessionData.questionsAsked = 1;
      await setSessionData(procedureId, sessionData);

      return NextResponse.json({
        question: customFirstQuestion,
        questionNumber: 1,
        totalQuestions: 'ongoing',
        sessionData: {
          topics: sessionData.topics,
          topicStats: getTopicCoverageStats(sessionData.topics),
          topicsByCategory: getTopicsByCategory(sessionData.topics),
          interviewCompleted: sessionData.interviewCompleted
        }
      });
    }

    // For subsequent questions, select from batched questions
    const availableQuestions = sessionData.batchedQuestions.filter(q => !q.used);
    
    // Generate more questions if we're running low, using enhanced context
    if (availableQuestions.length <= 2) {
      const newQuestions = await generateBatchedQuestions(
        procedureTitle,
        contextToUse,
        sessionData.conversationHistory,
        sessionData.topics,
        5
      );
      sessionData.batchedQuestions.push(...newQuestions);
    }

    // Select the best question based on topic coverage
    const selectedQuestion = selectBestQuestion(sessionData.batchedQuestions, sessionData.topics);
    if (selectedQuestion) {
      selectedQuestion.used = true;
      sessionData.questionsAsked += 1;
      await setSessionData(procedureId, sessionData);

      return NextResponse.json({
        question: selectedQuestion.question,
        questionNumber: sessionData.questionsAsked,
        totalQuestions: 'ongoing',
        sessionData: {
          topics: sessionData.topics,
          topicStats: getTopicCoverageStats(sessionData.topics),
          topicsByCategory: getTopicsByCategory(sessionData.topics),
          interviewCompleted: sessionData.interviewCompleted
        }
      });
    }

    // Fallback generic question
    return NextResponse.json({
      question: "Can you elaborate more on any aspect of this procedure that you think is particularly important?",
      questionNumber: sessionData.questionsAsked + 1,
      totalQuestions: 'ongoing',
      sessionData: {
        topics: sessionData.topics,
        topicStats: getTopicCoverageStats(sessionData.topics),
        topicsByCategory: getTopicsByCategory(sessionData.topics),
        interviewCompleted: sessionData.interviewCompleted
      }
    });

  } catch (error) {
    console.error('Error generating interview question:', error);
    return NextResponse.json({
      error: 'Failed to generate question',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get enhanced context if media processing is complete, otherwise return original context
 */
async function getEnhancedContextIfAvailable(taskId: string, fallbackContext: string): Promise<string> {
  try {
    // For now, just return the fallback context since interviewContext table doesn't exist
    // TODO: Implement enhanced context when media processing is added
    console.log('Using original context (enhanced context not yet implemented)');
    return fallbackContext;
  } catch (error) {
    console.error('Error getting enhanced context:', error);
    return fallbackContext;
  }
}

function generateCustomFirstQuestion(procedureTitle: string, initialContext: string): string {
  // Always return the simple, open-ended first question about the topic
  return `Tell me about ${procedureTitle}. Please provide an overview of this topic, including any key concepts, processes, or challenges you think are important.`;
}

function selectBestQuestion(questions: any[], topics: any[]): any | null {
  const availableQuestions = questions.filter(q => !q.used);
  if (availableQuestions.length === 0) return null;

  // Find topics that need more coverage
  const topicsNeedingAttention = topics.filter(topic => 
    topic.isRequired && topic.status !== 'thoroughly-covered'
  );

  // Prefer questions that target topics needing attention
  for (const topic of topicsNeedingAttention) {
    const relevantQuestion = availableQuestions.find(q => 
      q.relatedTopics.includes(topic.id) || 
      q.keywords.some((keyword: string) => topic.keywords.includes(keyword))
    );
    if (relevantQuestion) {
      return relevantQuestion;
    }
  }

  // Sort by priority and return highest priority available question
  availableQuestions.sort((a, b) => a.priority - b.priority);
  return availableQuestions[0];
} 
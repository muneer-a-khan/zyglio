import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { 
  getSessionData, 
  setSessionData, 
  updateTopicCoverage,
  checkInterviewCompletion,
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

    const { procedureId, smeResponse, currentQuestion } = await request.json();

    if (!procedureId || !smeResponse) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let sessionData = await getSessionData(procedureId);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Add conversation entries
    sessionData.conversationHistory.push(
      { role: 'ai', content: currentQuestion || '', timestamp: new Date() },
      { role: 'user', content: smeResponse, timestamp: new Date() }
    );

    // Mark first overview as given if this is the first response
    if (!sessionData.firstOverviewGiven) {
      sessionData.firstOverviewGiven = true;
    }

    // Update topic coverage based on SME response
    sessionData = await updateTopicCoverage(procedureId, smeResponse);

    // Background generation of more questions if running low
    const availableQuestions = sessionData.batchedQuestions.filter(q => !q.used);
    if (availableQuestions.length <= 2) {
      // Generate more questions in background (don't await to avoid delays)
      generateMoreQuestionsBackground(procedureId, sessionData);
    }

    // Check if interview should be completed every 3 questions
    if (sessionData.questionsAsked >= 3 && sessionData.questionsAsked % 3 === 0) {
      const isComplete = await checkInterviewCompletion(sessionData);
      if (isComplete) {
        return NextResponse.json({
          success: true,
          interviewCompleted: true,
          message: "Congratulations! You've covered all the required topics thoroughly. The interview is now complete.",
          sessionData: {
            topics: sessionData.topics,
            topicStats: getTopicCoverageStats(sessionData.topics),
            topicsByCategory: getTopicsByCategory(sessionData.topics),
            interviewCompleted: sessionData.interviewCompleted
          }
        });
      }
    }

    // Process the response and clean it
    const cleanedResponse = await processAndCleanResponse(smeResponse);

    return NextResponse.json({
      success: true,
      processedResponse: cleanedResponse,
      interviewCompleted: sessionData.interviewCompleted,
      sessionData: {
        topics: sessionData.topics,
        topicStats: getTopicCoverageStats(sessionData.topics),
        topicsByCategory: getTopicsByCategory(sessionData.topics),
        interviewCompleted: sessionData.interviewCompleted
      }
    });

  } catch (error) {
    console.error('Error processing interview turn:', error);
    return NextResponse.json({
      error: 'Failed to process interview turn',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processAndCleanResponse(response: string): Promise<string> {
  try {
    const systemPrompt = `You are a text processing assistant. Your job is to clean up speech-to-text transcriptions or user responses to make them more readable while preserving all the original meaning and content.

Tasks:
1. Fix obvious speech-to-text errors and typos
2. Add proper punctuation and capitalization
3. Break up run-on sentences where appropriate
4. Remove filler words (um, uh, like) sparingly - only when they don't affect readability
5. Preserve the speaker's voice and speaking style
6. Don't add or remove any substantial content
7. Don't change technical terms or procedures

Return only the cleaned text, nothing else.`;

    const userPrompt = `Please clean up this response while preserving all the original meaning and content:

"${response}"`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const cleanedResponse = completion.choices[0]?.message?.content?.trim();
    return cleanedResponse || response;

  } catch (error) {
    console.error('Error cleaning response:', error);
    return response; // Return original if cleaning fails
  }
}

// Background function to generate more questions without blocking the response
async function generateMoreQuestionsBackground(procedureId: string, sessionData: any) {
  try {
    const newQuestions = await generateBatchedQuestions(
      sessionData.initialContext, // Using as procedure title fallback
      sessionData.initialContext,
      sessionData.conversationHistory,
      sessionData.topics,
      5
    );

    // Update session with new questions
    const updatedSession = await getSessionData(procedureId);
    if (updatedSession) {
      updatedSession.batchedQuestions.push(...newQuestions);
      await setSessionData(procedureId, updatedSession);
    }
  } catch (error) {
    console.error('Error generating background questions:', error);
    // Fail silently to not affect user experience
  }
} 
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

// Pre-generated questions for different topics
const FAST_QUESTIONS = [
  "What are the key steps involved in this process?",
  "What safety considerations should someone be aware of?",
  "What equipment or tools are typically needed?", 
  "What are common mistakes people make with this procedure?",
  "How do you know when the procedure has been completed successfully?",
  "What would you do if something goes wrong during the process?",
  "What preparation is needed before starting this procedure?",
  "How long does this procedure typically take?",
  "What skills or knowledge does someone need to perform this safely?",
  "Are there any variations or alternatives to this approach?"
];

// Removed timeout helper since we're making calls faster

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedureId, procedureTitle } = await request.json();

    if (!procedureId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let sessionData = await getSessionData(procedureId);

    // If no session exists, initialize it
    if (!sessionData) {
      sessionData = await initializeSession(procedureId, procedureTitle || 'Unknown Procedure', procedureTitle || 'Unknown Procedure');
    }

    // Generate first question if this is the start
    if (sessionData.questionsAsked === 0) {
      // Create the first question - "Tell me about X" format
      const customFirstQuestion = generateCustomFirstQuestion(procedureTitle);
      
      console.log('Generated first question:', customFirstQuestion);

      // Generate initial batch of questions with fast AI
      const batchedQuestions = await generateBatchedQuestions(
        procedureTitle,
        sessionData.initialContext,
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

    // For subsequent questions, select from AI-generated questions
    const availableQuestions = sessionData.batchedQuestions.filter(q => !q.used);
    
    // Generate more questions if we're running low
    if (availableQuestions.length <= 2) {
      const newQuestions = await generateBatchedQuestions(
        procedureTitle,
        sessionData.initialContext,
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
    console.error('Error generating question:', error);
    return NextResponse.json({
      error: 'Failed to generate question',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateCustomFirstQuestion(procedureTitle: string): string {
  // Always return the simple, open-ended first question about the topic
  return `Tell me about ${procedureTitle}. Please provide an overview of this topic, including any key concepts, processes, or challenges you think are important.`;
}

function selectBestQuestion(questions: any[], topics: any[]): any | null {
  const availableQuestions = questions.filter(q => !q.used);
  if (availableQuestions.length === 0) return null;

  // Find topics that need more coverage (exclude thoroughly covered topics)
  const topicsNeedingAttention = topics.filter(topic => 
    topic.isRequired && topic.status !== 'thoroughly-covered' && topic.coverageScore < 80
  );

  // Get thoroughly covered topics to avoid
  const thoroughlyCoveredTopics = topics.filter(topic => 
    topic.status === 'thoroughly-covered' || topic.coverageScore >= 80
  );

  console.log(`[selectBestQuestion] ${topicsNeedingAttention.length} topics need attention, ${thoroughlyCoveredTopics.length} are thoroughly covered`);

  // Filter out questions that target thoroughly covered topics
  const questionsNotAboutCoveredTopics = availableQuestions.filter(q => {
    // Check if this question targets a thoroughly covered topic
    const targetsCompletedTopic = thoroughlyCoveredTopics.some(topic => {
      const hasRelatedTopic = q.relatedTopics && q.relatedTopics.includes(topic.id);
      const hasKeywordMatch = q.keywords && Array.isArray(q.keywords) && topic.keywords && 
        q.keywords.some((keyword: string) => topic.keywords.includes(keyword));
      return hasRelatedTopic || hasKeywordMatch;
    });
    
    return !targetsCompletedTopic; // Keep questions that DON'T target completed topics
  });

  console.log(`[selectBestQuestion] Filtered from ${availableQuestions.length} to ${questionsNotAboutCoveredTopics.length} questions (avoiding covered topics)`);

  // Prefer questions that target topics needing attention
  for (const topic of topicsNeedingAttention) {
    const relevantQuestion = questionsNotAboutCoveredTopics.find(q => {
      // Safe check for relatedTopics
      const hasRelatedTopic = q.relatedTopics && q.relatedTopics.includes(topic.id);
      
      // Safe check for keywords
      const hasKeywordMatch = q.keywords && Array.isArray(q.keywords) && topic.keywords && 
        q.keywords.some((keyword: string) => topic.keywords.includes(keyword));
      
      return hasRelatedTopic || hasKeywordMatch;
    });
    if (relevantQuestion) {
      console.log(`[selectBestQuestion] Selected question targeting topic: ${topic.name} (${topic.coverageScore.toFixed(0)}% covered)`);
      return relevantQuestion;
    }
  }

  // If no specific topic match, sort by priority and return highest priority available question (from filtered list)
  const finalQuestions = questionsNotAboutCoveredTopics.length > 0 ? questionsNotAboutCoveredTopics : availableQuestions;
  finalQuestions.sort((a, b) => a.priority - b.priority);
  
  if (finalQuestions[0]) {
    console.log(`[selectBestQuestion] Selected general question: ${finalQuestions[0].question.substring(0, 50)}...`);
  }
  
  return finalQuestions[0];
} 
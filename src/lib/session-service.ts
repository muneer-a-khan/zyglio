import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Types
export interface SessionData {
  procedureId: string;
  initialContext: string;
  conversationHistory: ConversationEntry[];
  batchedQuestions: BatchedQuestion[];
  questionsAsked: number;
  interviewCompleted: boolean;
  topics: TopicItem[];
  firstOverviewGiven: boolean;
}

export interface ConversationEntry {
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date;
}

export interface BatchedQuestion {
  id: string;
  question: string;
  category: string;
  keywords: string[];
  used: boolean;
  priority: number; // 1 = high priority, 5 = low priority
  relatedTopics: string[]; // Topic IDs this question relates to
}

export interface TopicItem {
  id: string;
  name: string;
  category: string;
  status: 'not-discussed' | 'briefly-discussed' | 'thoroughly-covered'; // red, yellow, green
  isRequired: boolean;
  keywords: string[];
  description?: string;
  coverageScore: number; // 0-100 indicating how well covered
}

// In-memory session store
// This should be replaced with a database in production
if (!global.sessionStore) {
  global.sessionStore = new Map<string, SessionData>();
}
const sessionStore = global.sessionStore;

/**
 * Retrieve a session by ID
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  return sessionStore.get(sessionId) || null;
}

/**
 * Update conversation history in a session
 */
export async function updateConversationHistory(
  sessionId: string,
  entry: ConversationEntry
): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return false;
  }
  
  session.conversationHistory.push(entry);
  sessionStore.set(sessionId, session);
  
  return true;
}

/**
 * Create a new interview session with initial context
 */
export async function createSession(
  sessionId: string, 
  sessionData: SessionData
): Promise<string> {
  try {
    // Store the session in the global sessions Map
    sessionStore.set(sessionId, sessionData);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Add batched questions to a session
 */
export async function addBatchedQuestions(
  sessionId: string,
  questions: BatchedQuestion[]
): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return false;
  }
  
  session.batchedQuestions.push(...questions);
  sessionStore.set(sessionId, session);
  
  return true;
}

/**
 * Get the best next question based on the user's response
 */
export async function selectNextQuestion(
  sessionId: string,
  userResponse: string
): Promise<BatchedQuestion | null> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    console.error(`[selectNextQuestion] Session ${sessionId} not found`);
    return null;
  }
  
  // Get unused questions
  const unusedQuestions = session.batchedQuestions.filter(q => !q.used);
  console.log(`[selectNextQuestion] Found ${unusedQuestions.length} unused questions out of ${session.batchedQuestions.length} total`);
  
  if (unusedQuestions.length === 0) {
    console.warn('[selectNextQuestion] No unused questions available');
    return null;
  }
  
  // Simple keyword matching to find most relevant question
  const userWords = userResponse.toLowerCase().split(/\s+/);
  
  // Track scores for all questions for debugging
  const questionScores: {question: BatchedQuestion, score: number, matches: string[]}[] = [];
  
  // Default to first question if no matches are found
  let bestQuestion = unusedQuestions[0];
  let bestScore = 0;
  
  for (const question of unusedQuestions) {
    let score = 0;
    const matches: string[] = [];
    
    // Score based on keyword matches
    for (const keyword of question.keywords) {
      const keywordLower = keyword.toLowerCase();
      const foundMatch = userWords.some(word => {
        const hasMatch = word.includes(keywordLower) || keywordLower.includes(word);
        if (hasMatch && word.length > 2) { // Only count substantial words
          return true;
        }
        return false;
      });
      
      if (foundMatch) {
        score += 1;
        matches.push(keyword);
      }
    }
    
    // Add to score tracking
    questionScores.push({question, score, matches});
    
    if (score > bestScore) {
      bestScore = score;
      bestQuestion = question;
    }
  }
  
  // Sort and log scores for debugging
  questionScores.sort((a, b) => b.score - a.score);
  console.log(`[selectNextQuestion] Top scoring questions:`);
  questionScores.slice(0, 3).forEach(qs => {
    console.log(`- Score ${qs.score}: "${qs.question.question.substring(0, 30)}..." (matches: ${qs.matches.join(', ')})`);
  });
  
  // If we didn't find any good matches, just take the first unused question
  if (bestScore === 0) {
    console.log('[selectNextQuestion] No keyword matches found, using random question');
    bestQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
  }
  
  // Mark the selected question as used
  const questionIndex = session.batchedQuestions.findIndex(q => q.id === bestQuestion.id);
  if (questionIndex !== -1) {
    session.batchedQuestions[questionIndex].used = true;
    sessionStore.set(sessionId, session);
    console.log(`[selectNextQuestion] Selected question from category: ${bestQuestion.category}`);
  } else {
    console.error('[selectNextQuestion] Failed to mark question as used');
  }
  
  return bestQuestion;
}

/**
 * Mark interview as completed
 */
export async function markInterviewCompleted(sessionId: string): Promise<boolean> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return false;
  }
  
  session.interviewCompleted = true;
  sessionStore.set(sessionId, session);
  
  return true;
}

/**
 * Increment questions asked counter
 */
export async function incrementQuestionsAsked(sessionId: string): Promise<number> {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return 0;
  }
  
  session.questionsAsked += 1;
  sessionStore.set(sessionId, session);
  
  return session.questionsAsked;
}

// Session management functions
export async function initializeSession(procedureId: string, initialContext: string, procedureTitle: string): Promise<SessionData> {
  // Generate initial topics
  const topicsResponse = await fetch('/api/deepseek/generate-initial-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ procedureTitle, initialContext })
  });

  let initialTopics: TopicItem[] = [];
  if (topicsResponse.ok) {
    const topicsResult = await topicsResponse.json();
    initialTopics = topicsResult.topics || [];
  }

  const sessionData: SessionData = {
    procedureId,
    initialContext,
    conversationHistory: [],
    batchedQuestions: [],
    questionsAsked: 0,
    interviewCompleted: false,
    topics: initialTopics,
    firstOverviewGiven: false,
  };

  await setSessionData(procedureId, sessionData);
  return sessionData;
}

export async function updateTopicCoverage(
  procedureId: string, 
  smeResponse: string
): Promise<SessionData> {
  const sessionData = await getSessionData(procedureId);
  if (!sessionData) {
    throw new Error('Session not found');
  }

  // Analyze topic coverage
  const analysisResponse = await fetch('/api/deepseek/analyze-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smeResponse,
      topics: sessionData.topics,
      conversationHistory: sessionData.conversationHistory
    })
  });

  if (analysisResponse.ok) {
    const analysisResult = await analysisResponse.json();
    const topicUpdates = analysisResult.analysis?.topicUpdates || [];

    // Update topics with new coverage info
    sessionData.topics = sessionData.topics.map(topic => {
      const update = topicUpdates.find((u: any) => u.id === topic.id);
      if (update) {
        return {
          ...topic,
          status: update.status,
          coverageScore: update.coverageScore,
          keywords: [...new Set([...topic.keywords, ...(update.mentionedKeywords || [])])]
        };
      }
      return topic;
    });
  }

  // Discover new topics
  const discoveryResponse = await fetch('/api/deepseek/discover-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smeResponse,
      existingTopics: sessionData.topics,
      procedureTitle: sessionData.initialContext,
      initialContext: sessionData.initialContext
    })
  });

  if (discoveryResponse.ok) {
    const discoveryResult = await discoveryResponse.json();
    const newTopics = discoveryResult.discovery?.newTopics || [];

    // Add new topics with IDs and initial status
    const topicsWithMetadata = newTopics.map((topic: any, index: number) => ({
      ...topic,
      id: `topic_discovered_${Date.now()}_${index}`,
      status: 'not-discussed' as const,
      coverageScore: 0
    }));

    sessionData.topics = [...sessionData.topics, ...topicsWithMetadata];
  }

  await setSessionData(procedureId, sessionData);
  return sessionData;
}

export async function checkInterviewCompletion(sessionData: SessionData): Promise<boolean> {
  const requiredTopics = sessionData.topics.filter(topic => topic.isRequired);
  const thoroughlyCoveredRequired = requiredTopics.filter(topic => topic.status === 'thoroughly-covered');
  
  // Interview is complete when all required topics are thoroughly covered
  const isComplete = thoroughlyCoveredRequired.length === requiredTopics.length && requiredTopics.length > 0;
  
  if (isComplete && !sessionData.interviewCompleted) {
    sessionData.interviewCompleted = true;
    await setSessionData(sessionData.procedureId, sessionData);
  }
  
  return isComplete;
}

export function getTopicsByCategory(topics: TopicItem[]): Record<string, TopicItem[]> {
  return topics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, TopicItem[]>);
}

export function getTopicCoverageStats(topics: TopicItem[]): {
  total: number;
  required: number;
  optional: number;
  notDiscussed: number;
  brieflyDiscussed: number;
  thoroughlyCovered: number;
  requiredCovered: number;
} {
  const requiredTopics = topics.filter(topic => topic.isRequired);
  const optionalTopics = topics.filter(topic => !topic.isRequired);
  
  return {
    total: topics.length,
    required: requiredTopics.length,
    optional: optionalTopics.length,
    notDiscussed: topics.filter(topic => topic.status === 'not-discussed').length,
    brieflyDiscussed: topics.filter(topic => topic.status === 'briefly-discussed').length,
    thoroughlyCovered: topics.filter(topic => topic.status === 'thoroughly-covered').length,
    requiredCovered: requiredTopics.filter(topic => topic.status === 'thoroughly-covered').length
  };
}

export async function generateBatchedQuestions(
  procedureTitle: string,
  initialContext: string,
  conversationHistory: ConversationEntry[],
  topics: TopicItem[],
  count: number = 5
): Promise<BatchedQuestion[]> {
  try {
    // Analyze which topics need more coverage
    const topicsNeedingAttention = topics.filter(topic => 
      topic.isRequired && topic.status !== 'thoroughly-covered'
    );

    const recentConversation = conversationHistory.slice(-6).map(entry => 
      `${entry.role}: ${entry.content}`
    ).join('\n');

    const systemPrompt = `You are an expert interviewer conducting knowledge capture sessions with SMEs. Your goal is to generate targeted questions that will help cover specific topics thoroughly for teaching purposes.

Focus on:
1. Filling gaps in topic coverage
2. Getting deeper into areas that were only briefly mentioned
3. Exploring practical aspects, challenges, and nuances
4. Ensuring comprehensive understanding for teaching others

Generate questions that are:
- Specific and actionable
- Build on previous conversation
- Target areas needing more coverage
- Encourage detailed explanations
- Focus on teaching-relevant information`;

    const topicGuidance = topicsNeedingAttention.length > 0 
      ? `\n\nTopics that need more coverage:\n${topicsNeedingAttention.map(topic => 
          `- ${topic.name} (${topic.category}): ${topic.description || 'No description'} [Status: ${topic.status}]`
        ).join('\n')}`
      : '\n\nAll required topics are well covered. Focus on depth and practical details.';

    const userPrompt = `Procedure: "${procedureTitle}"
Context: "${initialContext}"

Recent Conversation:
${recentConversation || 'No previous conversation'}

${topicGuidance}

Generate ${count} targeted interview questions that will help gather comprehensive information for teaching this procedure. Each question should target specific knowledge gaps or build on previous responses.

Return a JSON object with this structure:
{
  "questions": [
    {
      "question": "Specific question text",
      "category": "Safety" | "Equipment" | "Technique" | "Preparation" | "Theory" | "Troubleshooting" | "Quality Control" | "Other",
      "keywords": ["keyword1", "keyword2"],
      "priority": 1-5,
      "relatedTopics": ["topic_id1", "topic_id2"],
      "reasoning": "Why this question is important for teaching"
    }
  ]
}`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from DeepSeek');
    }

    let questionsResult;
    try {
      questionsResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', responseContent);
      throw new Error('Invalid JSON response from DeepSeek');
    }

    // Transform to BatchedQuestion format
    const batchedQuestions: BatchedQuestion[] = questionsResult.questions.map((q: any, index: number) => ({
      id: `q_${Date.now()}_${index}`,
      question: q.question,
      category: q.category || 'Other',
      keywords: q.keywords || [],
      used: false,
      priority: q.priority || 3,
      relatedTopics: q.relatedTopics || []
    }));

    return batchedQuestions;

  } catch (error) {
    console.error('Error generating batched questions:', error);
    
    // Fallback questions
    const fallbackQuestions: BatchedQuestion[] = [
      {
        id: `fallback_${Date.now()}_1`,
        question: "What are the most critical safety considerations someone should know?",
        category: "Safety",
        keywords: ["safety", "precautions", "risks"],
        used: false,
        priority: 1,
        relatedTopics: []
      },
      {
        id: `fallback_${Date.now()}_2`,
        question: "Can you walk me through the key equipment or tools needed?",
        category: "Equipment",
        keywords: ["equipment", "tools", "materials"],
        used: false,
        priority: 2,
        relatedTopics: []
      },
      {
        id: `fallback_${Date.now()}_3`,
        question: "What are the most common mistakes or challenges people face?",
        category: "Troubleshooting",
        keywords: ["mistakes", "challenges", "problems"],
        used: false,
        priority: 2,
        relatedTopics: []
      }
    ];

    return fallbackQuestions.slice(0, count);
  }
}

/**
 * Get session data by procedure ID
 */
export async function getSessionData(procedureId: string): Promise<SessionData | null> {
  const sessionId = `procedure_${procedureId}`;
  return sessionStore.get(sessionId) || null;
}

/**
 * Save session data by procedure ID
 */
export async function setSessionData(procedureId: string, data: SessionData): Promise<void> {
  const sessionId = `procedure_${procedureId}`;
  sessionStore.set(sessionId, data);
} 
import OpenAI from 'openai';

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Get the base URL for API calls from environment variables or use a default
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 
                 process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                 'http://localhost:3000';

// Helper function to get absolute URL
const getApiUrl = (path: string) => {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

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
  try {
    // Generate initial topics
    const topicsResponse = await fetch(getApiUrl('/api/deepseek/generate-initial-topics'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedureTitle, initialContext })
    });

    let initialTopics: TopicItem[] = [];
    if (topicsResponse.ok) {
      const topicsResult = await topicsResponse.json();
      initialTopics = topicsResult.topics || [];
    } else {
      console.error(`Failed to generate initial topics: ${topicsResponse.status} ${topicsResponse.statusText}`);
      // Create some default topics instead of failing completely
      initialTopics = generateDefaultTopics(procedureTitle);
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
  } catch (error) {
    console.error("Error initializing session:", error);
    // Create a session with default topics even if there's an error
    const sessionData: SessionData = {
      procedureId,
      initialContext,
      conversationHistory: [],
      batchedQuestions: [],
      questionsAsked: 0,
      interviewCompleted: false,
      topics: generateDefaultTopics(procedureTitle),
      firstOverviewGiven: false,
    };
    await setSessionData(procedureId, sessionData);
    return sessionData;
  }
}

// Function to generate default topics if API fails
function generateDefaultTopics(procedureTitle: string): TopicItem[] {
  const title = procedureTitle.toLowerCase();
  return [
    {
      id: `default_${Date.now()}_1`,
      name: `${procedureTitle} Overview`,
      category: 'General',
      status: 'not-discussed',
      isRequired: true,
      keywords: [title, 'overview', 'introduction', 'basics'],
      description: 'General overview of the procedure',
      coverageScore: 0
    },
    {
      id: `default_${Date.now()}_2`,
      name: 'Steps and Processes',
      category: 'Process',
      status: 'not-discussed',
      isRequired: true,
      keywords: ['steps', 'process', 'procedure', 'how to', 'instructions'],
      description: 'Step-by-step walkthrough of the procedure',
      coverageScore: 0
    },
    {
      id: `default_${Date.now()}_3`,
      name: 'Safety Considerations',
      category: 'Safety',
      status: 'not-discussed',
      isRequired: true,
      keywords: ['safety', 'precautions', 'warnings', 'hazards'],
      description: 'Safety measures and precautions',
      coverageScore: 0
    }
  ];
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
  const analysisResponse = await fetch(getApiUrl('/api/deepseek/analyze-topics'), {
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
  const discoveryResponse = await fetch(getApiUrl('/api/deepseek/discover-topics'), {
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
    // Special case for initial questions (1-3 general questions)
    if (conversationHistory.length === 0) {
      // Generate 1-3 initial general questions
      return generateInitialGeneralQuestions(procedureTitle, initialContext, topics);
    }

    // For subsequent questions, use the full context to generate more specific questions
    const topicsToFocus = topics
      .filter(t => t.status !== 'thoroughly-covered')
      .sort((a, b) => {
        // Prioritize required topics
        if (a.isRequired && !b.isRequired) return -1;
        if (!a.isRequired && b.isRequired) return 1;
        
        // Then prioritize by coverage
        return a.coverageScore - b.coverageScore;
      })
      .slice(0, 5);
    
    const topicFocusText = topicsToFocus.map(t => `${t.name} (${t.keywords.join(', ')})`).join('\n- ');
    
    // Format conversation history
    const recentConversation = conversationHistory
      .slice(-8) // Take last 8 exchanges to avoid exceeding token limits
      .map(entry => `${entry.role === 'ai' ? 'Question' : 'Answer'}: ${entry.content}`)
      .join('\n\n');
    
    // Generate increasingly specific questions based on the conversation history
    let specificityLevel = "general";
    if (conversationHistory.length >= 6) {
      specificityLevel = "detailed";
    } else if (conversationHistory.length >= 2) {
      specificityLevel = "moderate";
    }
    
    const systemPrompt = `You are an expert interviewer gathering detailed information about a procedure or process from a subject matter expert (SME).
    
Generate ${count} follow-up questions for the SME based on their previous answers. These questions should help extract deeper information about the procedure.

Current interview phase: ${specificityLevel} (as the interview progresses, questions should become more specific and detailed)

Focus on uncovering information about these topics that need more coverage:
- ${topicFocusText}

Question Guidelines:
- Questions should flow naturally from the conversation
- ${specificityLevel === "general" ? "Ask broad, open-ended questions about the general topic" : 
   specificityLevel === "moderate" ? "Focus on moderately specific aspects mentioned in previous answers" : 
   "Ask for specific details, edge cases, and advanced concepts"}
- Avoid repeating questions already asked
- Each question should target a specific aspect of the procedure
- Ask about challenges, exceptions, and best practices
- Questions should be clear and conversational
- Don't ask multiple questions in one prompt

Return the questions in valid JSON format:
[
  {
    "question": "question text",
    "category": "general topic area",
    "keywords": ["keyword1", "keyword2"],
    "priority": 1-5 (1 being highest priority),
    "relatedTopics": ["topicId1", "topicId2"]
  }
]`;

    const userPrompt = `Procedure Title: ${procedureTitle}

Initial Context:
${initialContext}

Topics that need coverage:
${topics.filter(t => t.status !== 'thoroughly-covered').map(t => `- ${t.name}`).join('\n')}

Recent Conversation:
${recentConversation}

Generate ${count} follow-up questions for the SME, with increasing specificity based on the conversation progress.`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    let parsedResponse: any = [];
    
    try {
      // Handle both array and object wrapper formats
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        const parsed = JSON.parse(responseText);
        parsedResponse = Array.isArray(parsed) ? parsed : parsed.questions || [];
      }
    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError);
      console.log('Raw response:', responseText);
      
      // Fallback questions if parsing fails
      return [
        {
          id: `fallback-1-${Date.now()}`,
          question: `Could you elaborate more on the ${procedureTitle} process?`,
          category: 'General',
          keywords: [procedureTitle.toLowerCase()],
          used: false,
          priority: 1,
          relatedTopics: []
        },
        {
          id: `fallback-2-${Date.now()}`,
          question: `What challenges might someone face when working with ${procedureTitle}?`,
          category: 'Challenges',
          keywords: ['challenges', 'problems', 'issues'],
          used: false,
          priority: 2,
          relatedTopics: []
        }
      ];
    }
    
    // Ensure all questions have IDs and set used flag to false
    return parsedResponse.map((q: any, index: number) => ({
      ...q,
      id: `question-${Date.now()}-${index}`,
      used: false,
      priority: q.priority || index + 1,
      relatedTopics: q.relatedTopics || []
    }));
    
  } catch (error) {
    console.error('Error generating batched questions:', error);
    
    // Return fallback questions
    return [
      {
        id: `error-fallback-1-${Date.now()}`,
        question: `Can you tell me more about ${procedureTitle}?`,
        category: 'General',
        keywords: [procedureTitle.toLowerCase()],
        used: false,
        priority: 1,
        relatedTopics: []
      },
      {
        id: `error-fallback-2-${Date.now()}`,
        question: 'What are the most important aspects of this procedure that someone should understand?',
        category: 'Key Concepts',
        keywords: ['important', 'key', 'understand'],
        used: false,
        priority: 2,
        relatedTopics: []
      }
    ];
  }
}

// New function to generate the initial 1-3 general questions
async function generateInitialGeneralQuestions(
  procedureTitle: string,
  initialContext: string,
  topics: TopicItem[]
): Promise<BatchedQuestion[]> {
  try {
    const systemPrompt = `You are an expert interviewer gathering detailed information about a procedure or process from a subject matter expert (SME).
    
Generate 3 initial general, open-ended questions for the SME about the topic "${procedureTitle}". These should be broad questions that allow the SME to share their general knowledge before getting into specifics.

Question Guidelines:
- Questions should be general and open-ended
- Each question should approach the topic from a different angle
- Questions should encourage detailed responses
- Questions should help establish the SME's level of expertise
- Questions should be clear and conversational

Return the questions in valid JSON format:
[
  {
    "question": "question text",
    "category": "general topic area",
    "keywords": ["keyword1", "keyword2"],
    "priority": 1-3 (1 being highest priority),
    "relatedTopics": []
  }
]`;

    const userPrompt = `Procedure Title: ${procedureTitle}

Initial Context:
${initialContext}

Generate 3 general, open-ended questions to start the interview about "${procedureTitle}".`;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    let parsedResponse: any = [];
    
    try {
      // Handle both array and object wrapper formats
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        const parsed = JSON.parse(responseText);
        parsedResponse = Array.isArray(parsed) ? parsed : parsed.questions || [];
      }
    } catch (parseError) {
      console.error('Error parsing initial questions JSON:', parseError);
      
      // Default general questions if parsing fails
      return [
        {
          id: `initial-1-${Date.now()}`,
          question: `Could you describe ${procedureTitle} in your own words and explain why it's important?`,
          category: 'General Overview',
          keywords: [procedureTitle.toLowerCase(), 'overview', 'importance'],
          used: false,
          priority: 1,
          relatedTopics: []
        },
        {
          id: `initial-2-${Date.now()}`,
          question: `What are the main components or steps involved in ${procedureTitle}?`,
          category: 'Process Steps',
          keywords: ['steps', 'components', 'process'],
          used: false,
          priority: 2,
          relatedTopics: []
        },
        {
          id: `initial-3-${Date.now()}`,
          question: `What common challenges or misconceptions do people have about ${procedureTitle}?`,
          category: 'Challenges',
          keywords: ['challenges', 'misconceptions', 'problems'],
          used: false,
          priority: 3,
          relatedTopics: []
        }
      ];
    }
    
    // Ensure all questions have IDs and set used flag to false
    return parsedResponse.map((q: any, index: number) => ({
      ...q,
      id: `initial-${Date.now()}-${index}`,
      used: false,
      priority: q.priority || index + 1,
      relatedTopics: q.relatedTopics || []
    }));
    
  } catch (error) {
    console.error('Error generating initial general questions:', error);
    
    // Return default general questions
    return [
      {
        id: `initial-fallback-1-${Date.now()}`,
        question: `Could you describe ${procedureTitle} in your own words and explain why it's important?`,
        category: 'General Overview',
        keywords: [procedureTitle.toLowerCase(), 'overview', 'importance'],
        used: false,
        priority: 1,
        relatedTopics: []
      },
      {
        id: `initial-fallback-2-${Date.now()}`,
        question: `What are the main components or steps involved in ${procedureTitle}?`,
        category: 'Process Steps',
        keywords: ['steps', 'components', 'process'],
        used: false,
        priority: 2,
        relatedTopics: []
      },
      {
        id: `initial-fallback-3-${Date.now()}`,
        question: `What common challenges or misconceptions do people have about ${procedureTitle}?`,
        category: 'Challenges',
        keywords: ['challenges', 'misconceptions', 'problems'],
        used: false,
        priority: 3,
        relatedTopics: []
      }
    ];
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
import OpenAI from 'openai';
import { getCachedResponse, cacheResponse, shouldUseFastModel, getOptimizedPrompt } from './ai-cache';

// Initialize DeepSeek client
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY is not defined in environment variables.');
}

const fastModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: apiKey,
  timeout: 5000,
  maxRetries: 1,
  defaultHeaders: {
    'Connection': 'keep-alive'
  }
});

const detailedModel = new OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: apiKey,
  timeout: 10000,
  maxRetries: 1,
  defaultHeaders: {
    'Connection': 'keep-alive'
  }
});

// Get the base URL for API calls from environment variables or use a default
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 
                 process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                 'http://localhost:3000';

// Helper function to get absolute URL
const getApiUrl = (path: string) => {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

// Helper function to get auth token from session
const getApiHeaders = async (): Promise<Record<string, string>> => {
  let token = null;
  
  // Try to get session token from client-side localStorage
  if (typeof window !== 'undefined') {
    // Try multiple possible token locations
    token = localStorage.getItem('next-auth.session-token') || 
            localStorage.getItem('supabase-auth-token') ||
            localStorage.getItem('__Secure-next-auth.session-token');
    
    // For cookie-based auth, we rely on cookies being sent automatically
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
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
declare global {
  var sessionStore: Map<string, SessionData> | undefined;
  var initializationCache: Map<string, Promise<SessionData>> | undefined;
}

if (!global.sessionStore) {
  global.sessionStore = new Map<string, SessionData>();
}
const sessionStore = global.sessionStore;

// Add a simple cache to prevent duplicate initialization
if (!global.initializationCache) {
  global.initializationCache = new Map<string, Promise<SessionData>>();
}
const initializationCache = global.initializationCache;

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
  // Check if we're already initializing this session to prevent duplicates
  if (initializationCache.has(procedureId)) {
    console.log('Session initialization already in progress for procedure:', procedureId);
    return initializationCache.get(procedureId)!;
  }

  // Check if session already exists
  const existingSession = await getSessionData(procedureId);
  if (existingSession) {
    console.log('Session already exists for procedure:', procedureId);
    return existingSession;
  }

  // Create a promise and cache it to prevent duplicate initialization
  const initPromise = (async (): Promise<SessionData> => {
    try {
      // Get auth headers for API requests
      const headers = await getApiHeaders();
      console.log('Initializing session with generate-initial-topics API call');
    
    // Generate initial topics
    const topicsResponse = await fetch(getApiUrl('/api/deepseek/generate-initial-topics'), {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify({ procedureTitle, initialContext })
    });

    let initialTopics: TopicItem[] = [];
    if (topicsResponse.ok) {
      const topicsResult = await topicsResponse.json();
      initialTopics = topicsResult.topics || [];
      console.log(`Generated ${initialTopics.length} initial topics successfully`);
    } else {
      console.error(`Failed to generate initial topics: ${topicsResponse.status} ${topicsResponse.statusText}`);
      const errorData = await topicsResponse.json().catch(() => ({}));
      console.error('Error details:', errorData);
      
      // Create some default topics instead of failing completely
      initialTopics = generateDefaultTopics(procedureTitle);
      console.log(`Using ${initialTopics.length} default topics instead`);
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
  })();

  // Cache the promise to prevent duplicate initialization
  initializationCache.set(procedureId, initPromise);

  try {
    const result = await initPromise;
    // Clean up the cache after successful initialization
    initializationCache.delete(procedureId);
    return result;
  } catch (error) {
    // Clean up the cache on error too
    initializationCache.delete(procedureId);
    throw error;
  }
}

// Function to generate default topics if API fails
function generateDefaultTopics(procedureTitle: string): TopicItem[] {
  const title = procedureTitle.toLowerCase();
  const timestamp = Date.now();
  
  // Create smart default topics based on the procedure title
  const defaultTopics: TopicItem[] = [
    {
      id: `default_${timestamp}_1`,
      name: `${procedureTitle} Overview`,
      category: 'General',
      status: 'not-discussed' as const,
      isRequired: true,
      keywords: [title, 'overview', 'introduction', 'basics', 'what is'],
      description: 'General overview and introduction',
      coverageScore: 0
    }
  ];

  // Add context-specific topics based on procedure title keywords
  if (title.includes('latency') || title.includes('performance') || title.includes('speed')) {
    defaultTopics.push(
      {
        id: `default_${timestamp}_2`,
        name: 'Performance Optimization',
        category: 'Technical',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['optimization', 'performance', 'speed', 'efficiency', 'tuning'],
        description: 'Performance optimization techniques',
        coverageScore: 0
      },
      {
        id: `default_${timestamp}_3`,
        name: 'Caching Strategies',
        category: 'Technical',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['cache', 'caching', 'memory', 'storage', 'redis', 'memcached'],
        description: 'Caching approaches and strategies',
        coverageScore: 0
      },
      {
        id: `default_${timestamp}_4`,
        name: 'Database Optimization',
        category: 'Technical',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['database', 'query', 'index', 'sql', 'optimization'],
        description: 'Database and query optimization',
        coverageScore: 0
      }
    );
  } else if (title.includes('voice') || title.includes('interview') || title.includes('llm') || title.includes('ai')) {
    defaultTopics.push(
      {
        id: `default_${timestamp}_2`,
        name: 'LLM Pipeline Architecture',
        category: 'Technical',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['llm', 'pipeline', 'architecture', 'model', 'ai', 'processing'],
        description: 'LLM pipeline design and architecture',
        coverageScore: 0
      },
      {
        id: `default_${timestamp}_3`,
        name: 'Voice Processing',
        category: 'Technical',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['voice', 'speech', 'audio', 'transcription', 'tts', 'stt'],
        description: 'Voice and speech processing',
        coverageScore: 0
      },
      {
        id: `default_${timestamp}_4`,
        name: 'Interview Logic',
        category: 'Process',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['interview', 'questions', 'conversation', 'dialogue', 'flow'],
        description: 'Interview flow and question logic',
        coverageScore: 0
      }
    );
  } else {
    // Generic fallback topics for other procedures
    defaultTopics.push(
      {
        id: `default_${timestamp}_2`,
        name: 'Implementation Steps',
        category: 'Process',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['steps', 'process', 'implementation', 'how to', 'procedure'],
        description: 'Step-by-step implementation',
        coverageScore: 0
      },
      {
        id: `default_${timestamp}_3`,
        name: 'Best Practices',
        category: 'Guidelines',
        status: 'not-discussed' as const,
        isRequired: true,
        keywords: ['best practices', 'guidelines', 'recommendations', 'tips'],
        description: 'Best practices and guidelines',
        coverageScore: 0
      }
    );
  }

  return defaultTopics;
}

export async function updateTopicCoverage(
  procedureId: string, 
  smeResponse: string
): Promise<SessionData> {
  const sessionData = await getSessionData(procedureId);
  if (!sessionData) {
    throw new Error('Session not found');
  }

  try {
    // Get auth headers for API requests
    const headers = await getApiHeaders();
    console.log('Making analyze-topics API call with auth:', headers['Authorization'] ? 'Bearer token present' : 'No auth token');
    console.log(`[updateTopicCoverage] Analyzing response: "${smeResponse.substring(0, 100)}..."`);
    console.log(`[updateTopicCoverage] Current topics:`, sessionData.topics.map(t => ({ 
      id: t.id, 
      name: t.name, 
      keywords: t.keywords,
      currentScore: t.coverageScore 
    })));
    
    // Analyze topic coverage
    const analysisResponse = await fetch(getApiUrl('/api/deepseek/analyze-topics'), {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify({
        smeResponse,
        topics: sessionData.topics,
        conversationHistory: sessionData.conversationHistory
      })
    });

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      
      // Handle both old format (with .analysis) and new format (direct)
      const topicUpdates = analysisResult.topicUpdates || analysisResult.analysis?.topicUpdates || [];
      const suggestedNewTopics = analysisResult.suggestedNewTopics || analysisResult.analysis?.suggestedNewTopics || [];
      const keywordMatches = analysisResult.keywordMatches || analysisResult.analysis?.keywordMatches || [];
      
      // Log for debugging
      console.log(`[updateTopicCoverage] Received ${topicUpdates.length} topic updates and ${suggestedNewTopics.length} suggested new topics`);
      console.log('[updateTopicCoverage] Response format:', { 
        hasDirectFormat: !!analysisResult.topicUpdates,
        hasAnalysisFormat: !!analysisResult.analysis?.topicUpdates,
        sampleUpdate: topicUpdates[0] 
      });
      
      // Track which topics were updated from the API
      const updatedTopicIds: string[] = [];
      topicUpdates.forEach((u: any) => {
        if (u.id) updatedTopicIds.push(u.id);
      });

      // Update topics with new coverage info
      sessionData.topics = sessionData.topics.map(topic => {
        // First check for detailed API analysis
        const update = topicUpdates.find((u: any) => u.id === topic.id);
        
        if (update) {
          // Merge keywords to expand the topic's keyword set
          const combinedKeywords = [
            ...topic.keywords, 
            ...(update.mentionedKeywords || [])
          ];
          const updatedKeywords = Array.from(new Set(combinedKeywords)).filter(Boolean);
          
          // Only increase coverage level, never decrease unless explicitly contradicted
          let newStatus = update.status;
          if (
            topic.status === 'thoroughly-covered' && 
            update.status !== 'thoroughly-covered' && 
            update.coverageScore < 71 &&
            !update.reasoning?.toLowerCase().includes('contradict')
          ) {
            // Keep the "thoroughly-covered" status once achieved
            newStatus = 'thoroughly-covered';
          }
          
          // Take the maximum score between current and new score
          const newScore = Math.max(topic.coverageScore, update.coverageScore);
          
          return {
            ...topic,
            status: newStatus,
            coverageScore: newScore,
            keywords: updatedKeywords
          };
        } 
        // If no API update, use keyword matching as a fallback
        else {
          const keywordMatch = keywordMatches.find((m: any) => m.id === topic.id);
          
          if (keywordMatch && !updatedTopicIds.includes(topic.id)) {
            // Only apply keyword match if the coverage score would increase
            if (keywordMatch.initialScore > topic.coverageScore) {
              let newStatus = topic.status;
              
              // Update status based on new score
              if (keywordMatch.initialScore >= 71) {
                newStatus = 'thoroughly-covered';
              } else if (keywordMatch.initialScore >= 26) {
                newStatus = 'briefly-discussed';
              }
              
              return {
                ...topic,
                status: newStatus,
                coverageScore: keywordMatch.initialScore
              };
            }
          }
          return topic;
        }
      });
      
      // Add suggested new topics
      if (suggestedNewTopics && suggestedNewTopics.length > 0) {
        const timestamp = Date.now();
        const newTopicsWithMetadata = suggestedNewTopics.map((topic: any, index: number) => {
          // Determine initial status and score based on the analysis
          let initialStatus = 'briefly-discussed' as const;
          let initialScore = 30; // Default to briefly discussed
          
          // If the topic was suggested by the API, it was likely mentioned
          // substantially in the response, so start with higher coverage
          
          return {
            id: `topic_suggested_${timestamp}_${index}`,
            name: topic.name,
            category: topic.category || 'General',
            status: initialStatus,
            isRequired: false, // New topics are optional by default
            keywords: topic.keywords || [],
            description: topic.description || '',
            coverageScore: initialScore
          };
        });
        
        // Add new topics
        sessionData.topics = [...sessionData.topics, ...newTopicsWithMetadata];
      }
    } else {
      console.error(`[updateTopicCoverage] Analysis API error: ${analysisResponse.status} ${analysisResponse.statusText}`);
      const errorData = await analysisResponse.json().catch(() => ({}));
      console.error('[updateTopicCoverage] Error details:', errorData);
    }

    // Also attempt to discover entirely new topics
    try {
      console.log('Making discover-topics API call with auth:', headers['Authorization'] ? 'Bearer token present' : 'No auth token');
      
      const discoveryResponse = await fetch(getApiUrl('/api/deepseek/discover-topics'), {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for auth
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

        // Filter out topics that would be duplicates of existing ones
        const existingTopicNames = sessionData.topics.map(t => t.name.toLowerCase());
        const uniqueNewTopics = newTopics.filter((topic: any) => 
          !existingTopicNames.includes(topic.name.toLowerCase())
        );

        // Add new topics with IDs and initial status
        if (uniqueNewTopics.length > 0) {
          const timestamp = Date.now();
          const topicsWithMetadata = uniqueNewTopics.map((topic: any, index: number) => ({
            ...topic,
            id: `topic_discovered_${timestamp}_${index}`,
            status: 'briefly-discussed' as const, // If we discovered it, it was mentioned
            coverageScore: 30, // Start with some coverage
            isRequired: false, // Discovered topics are optional by default
          }));

          sessionData.topics = [...sessionData.topics, ...topicsWithMetadata];
        }
      }
    } catch (discoveryError) {
      // Log but continue - discovery is a nice-to-have
      console.error('[updateTopicCoverage] Error in topic discovery:', discoveryError);
    }

    await setSessionData(procedureId, sessionData);
    return sessionData;
  } catch (error) {
    console.error('[updateTopicCoverage] Error analyzing topics:', error);
    // If we fail, return the session unchanged
    return sessionData;
  }
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
    // CRITICAL: Exclude thoroughly-covered topics to avoid repetitive questions
    const topicsToFocus = topics
      .filter(t => t.status !== 'thoroughly-covered' && t.coverageScore < 80) // Exclude well-covered topics
      .sort((a, b) => {
        // Prioritize required topics
        if (a.isRequired && !b.isRequired) return -1;
        if (!a.isRequired && b.isRequired) return 1;
        
        // Then prioritize by coverage (least covered first)
        return a.coverageScore - b.coverageScore;
      })
      .slice(0, 5);
    
    // If no topics need coverage, focus on advanced aspects of briefly-discussed topics
    const finalTopicsToFocus = topicsToFocus.length > 0 ? topicsToFocus : 
      topics.filter(t => t.status === 'briefly-discussed').slice(0, 3);
    
    const topicFocusText = finalTopicsToFocus.map(t => `${t.name} (${t.keywords.join(', ')})`).join('\n- ');
    
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
    
    // Analyze what's been covered and what needs attention
    const uncoveredTopics = topics.filter(t => t.status === 'not-discussed' && t.isRequired);
    const briefTopics = topics.filter(t => t.status === 'briefly-discussed');
    const thoroughlyDiscussed = topics.filter(t => t.status === 'thoroughly-covered');
    const lastResponse = conversationHistory[conversationHistory.length - 1]?.content || '';
    
    console.log(`[Question Context] ${uncoveredTopics.length} uncovered, ${briefTopics.length} brief, ${thoroughlyDiscussed.length} thoroughly covered topics`);
    
    const systemPrompt = `You are an expert interviewer conducting a technical procedure interview. Generate SPECIFIC, contextual follow-up questions.

CRITICAL: Questions must be:
- Specific to the conversation and what the SME just said
- Build directly on their last response (not generic)
- Target gaps in knowledge coverage
- Ask for concrete examples, step-by-step details, or specific scenarios
- Feel like a natural conversation continuation
- AVOID topics that are already thoroughly covered

Interview phase: ${specificityLevel}
${specificityLevel === "general" ? "Ask broad questions about core topics" : 
  specificityLevel === "moderate" ? "Focus on specific aspects they mentioned" : 
  "Dig deep into details, edge cases, and advanced concepts"}

Priority Topics Needing Coverage (FOCUS ON THESE):
${topicFocusText}

Topics Already Thoroughly Covered (AVOID THESE):
${thoroughlyDiscussed.map(t => `${t.name} (${t.coverageScore.toFixed(0)}% covered)`).join(', ') || 'None yet'}

Return valid JSON: [{"question": "specific question text", "category": "category", "keywords": ["key1"], "priority": 1, "relatedTopics": ["topicId"]}]`;

    // Extract key concepts from their last response
    const lastResponseText = lastResponse.substring(0, 200);
    const mentionedConcepts = topics.flatMap(t => t.keywords)
      .filter(kw => lastResponse.toLowerCase().includes(kw.toLowerCase()))
      .slice(0, 4);
    
    // Extract important phrases and concepts they mentioned
    const extractImportantTerms = (text: string): string[] => {
      const words = text.toLowerCase().split(/\s+/);
      const phrases: string[] = [];
      
      // Find 2-3 word meaningful phrases
      for (let i = 0; i < words.length - 1; i++) {
        const twoWord = `${words[i]} ${words[i + 1]}`;
        const threeWord = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : '';
        
        // Skip common words and short phrases
        if (twoWord.length > 6 && !['of the', 'in the', 'to the', 'for the', 'and the'].includes(twoWord)) {
          phrases.push(twoWord);
        }
        if (threeWord && threeWord.length > 10) {
          phrases.push(threeWord);
        }
      }
      
      // Also extract single important-sounding words (nouns, adjectives)
      const importantWords = words.filter(word => 
        word.length > 4 && 
        !['that', 'with', 'this', 'they', 'have', 'been', 'will', 'some', 'when', 'then'].includes(word)
      );
      
      return [...phrases.slice(0, 3), ...importantWords.slice(0, 4)];
    };
    
    const mentionedTerms = extractImportantTerms(lastResponse);
    
    const specificMentions = lastResponse.split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 2); // Get first 2 substantial sentences
    
    const userPrompt = `Procedure: ${procedureTitle}

Their Recent Response:
"${lastResponseText}${lastResponse.length > 200 ? '...' : ''}"

Specific Technical Terms They Mentioned: ${mentionedTerms.join(', ') || 'general concepts'}
Key Points They Made: ${specificMentions.join(' | ') || 'general discussion'}

Uncovered Topics: ${uncoveredTopics.map(t => t.name).join(', ') || 'most topics covered'}
Need More Detail: ${briefTopics.map(t => t.name).join(', ') || 'none'}

Generate ${Math.min(count, 3)} SPECIFIC follow-up questions that:

1. **Reference their exact words**: Quote or paraphrase something they specifically said
2. **Ask for deeper details**: Get concrete examples, step-by-step processes, or specific techniques
3. **Target gaps**: Focus on UNCOVERED topics (${uncoveredTopics.map(t => t.name).join(', ') || 'none'}) or expand briefly-mentioned concepts
4. **Sound conversational**: Like a colleague asking for more details, not a generic interview
5. **AVOID repetition**: Don't ask about topics already thoroughly covered (${thoroughlyDiscussed.map(t => t.name).join(', ') || 'none'})

PRIORITY FOCUS AREAS:
${finalTopicsToFocus.map(t => `- ${t.name} (${t.coverageScore.toFixed(0)}% covered)`).join('\n') || '- Move to advanced topics or wrap up'}

Examples:
- "You mentioned '${mentionedTerms[0] || 'optimization'}' - could you walk me through your specific approach to that?"
- "When you talked about '${mentionedTerms[1] || 'performance issues'}', what specific strategies have you found most effective?"
- "You brought up '${mentionedTerms[2] || 'technical challenges'}' - what are the biggest gotchas people should watch out for?"

Make each question feel like a natural follow-up that moves the conversation forward to NEW topics.`;

    // More specific cache key that includes conversation context
    const lastResponseSnippet = conversationHistory[conversationHistory.length - 1]?.content.substring(0, 50) || '';
    const uncoveredCount = topics.filter(t => t.status === 'not-discussed').length;
    const cacheKey = `questions_${procedureTitle}_${uncoveredCount}_${lastResponseSnippet}`;
    
    const cached = getCachedResponse(cacheKey);
    if (cached && cached.length > 0) {
      console.log('Using cached batch questions');
      return cached;
    }

    // Use two-stage model selection
    const model = shouldUseFastModel(procedureTitle + ' ' + (conversationHistory[0]?.content || ''), { task: 'questions' }) ? fastModel : detailedModel;
    const optimizedPrompt = getOptimizedPrompt('questionGeneration', { priority: 'speed' });
    
    // Ensure prompt contains "json" for response_format requirement
    const finalPrompt = optimizedPrompt ? 
      `${optimizedPrompt} Return response as valid JSON format.` : 
      `${systemPrompt} IMPORTANT: Return your response in valid JSON format.`;
    
    const completion = await model.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: finalPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    let parsedResponse: any = [];
    
    try {
      // Handle both array and object wrapper formats
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
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
      const fallbackResult = [
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
    console.log('Generating initial general questions with DeepSeek API...');
    console.log('DeepSeek API key available:', !!apiKey);
    const systemPrompt = `You are an expert interviewer who asks intelligent, domain-specific follow-up questions. Generate contextual questions that would naturally follow an overview discussion about this topic.

Create questions that:
- Are specific to the domain (not generic templates)  
- Would logically follow after someone gives an overview
- Ask for concrete details, examples, or processes
- Feel like natural conversation progression

Return response in valid JSON format: [{"question": "text", "category": "category", "keywords": ["keyword1"], "priority": 1, "relatedTopics": []}]`;

    const userPrompt = `Topic/Procedure: "${procedureTitle}"
Available Topics: ${topics.map(t => `${t.name} (${t.keywords.slice(0, 3).join(', ')})`).join(', ')}

After someone gives an overview of "${procedureTitle}", what are 2-3 intelligent follow-up questions that would:

1. **Ask for specific processes**: "How do you..." or "What's your approach to..."
2. **Target key aspects**: Reference the important topics like ${topics.slice(0, 2).map(t => t.name).join(' and ')}
3. **Request concrete examples**: "Can you walk me through..." or "What does that look like in practice?"

Examples for different domains:
- Baking: "What's your approach to achieving the right gluten development?" "How do you know when fermentation is complete?"
- Software: "How do you handle edge cases in your implementation?" "What's your debugging process when things go wrong?"
- Training: "How do you adapt your approach for different skill levels?" "What indicators tell you the training is effective?"

Generate 2-3 domain-appropriate questions for "${procedureTitle}".`;

    // Check cache first
    const cacheKey = `initial_questions_${procedureTitle}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      console.log('Using cached initial questions');
      return cached;
    }

    // Use fast model for initial questions
    const model = fastModel;
    const optimizedPrompt = getOptimizedPrompt('questionGeneration', { priority: 'speed' });
    
    // Ensure prompt contains "json" for response_format requirement
    const finalPrompt = optimizedPrompt ? 
      `${optimizedPrompt} Return response as valid JSON format.` : 
      `${systemPrompt} IMPORTANT: Return your response in valid JSON format.`;
    
    const completion = await model.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: finalPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    let parsedResponse: any = [];
    
    try {
      // Handle both array and object wrapper formats
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        const parsed = JSON.parse(responseText);
        parsedResponse = Array.isArray(parsed) ? parsed : parsed.questions || [];
      }
    } catch (parseError) {
      console.error('Error parsing initial questions JSON:', parseError);
      
      // Create smart fallback questions based on the available topics
      const topicNames = topics.slice(0, 3).map(t => t.name);
      const fallbackResult = [
        {
          id: `initial-1-${Date.now()}`,
          question: topicNames[0] ? 
            `How do you approach ${topicNames[0].toLowerCase()} when working with ${procedureTitle}?` :
            `What's your specific approach to ${procedureTitle}?`,
          category: topicNames[0] || 'Process',
          keywords: topicNames[0] ? [topicNames[0].toLowerCase(), 'approach'] : ['approach', 'process'],
          used: false,
          priority: 1,
          relatedTopics: topics[0] ? [topics[0].id] : []
        },
        {
          id: `initial-2-${Date.now()}`,
          question: topicNames[1] ? 
            `Can you walk me through ${topicNames[1].toLowerCase()} in ${procedureTitle}?` :
            `What are the key considerations for ${procedureTitle}?`,
          category: topicNames[1] || 'Implementation',
          keywords: topicNames[1] ? [topicNames[1].toLowerCase(), 'process'] : ['considerations', 'key'],
          used: false,
          priority: 2,
          relatedTopics: topics[1] ? [topics[1].id] : []
        },
        {
          id: `initial-3-${Date.now()}`,
          question: `What practical challenges have you encountered with ${procedureTitle}?`,
          category: 'Practical Experience',
          keywords: ['challenges', 'practical', 'experience'],
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
    
    // Return contextual fallback questions based on available topics
    const topicNames = topics.slice(0, 3).map(t => t.name);
    return [
      {
        id: `initial-fallback-1-${Date.now()}`,
        question: topicNames[0] ? 
          `What's your approach to ${topicNames[0].toLowerCase()} in ${procedureTitle}?` :
          `What's the most critical aspect of ${procedureTitle}?`,
        category: topicNames[0] || 'Critical Aspects',
        keywords: topicNames[0] ? [topicNames[0].toLowerCase(), 'approach'] : ['critical', 'important'],
        used: false,
        priority: 1,
        relatedTopics: topics[0] ? [topics[0].id] : []
      },
      {
        id: `initial-fallback-2-${Date.now()}`,
        question: topicNames[1] ? 
          `How do you handle ${topicNames[1].toLowerCase()} when doing ${procedureTitle}?` :
          `What specific techniques do you use for ${procedureTitle}?`,
        category: topicNames[1] || 'Techniques',
        keywords: topicNames[1] ? [topicNames[1].toLowerCase(), 'handle'] : ['techniques', 'specific'],
        used: false,
        priority: 2,
        relatedTopics: topics[1] ? [topics[1].id] : []
      },
      {
        id: `initial-fallback-3-${Date.now()}`,
        question: `What would you say are the biggest pitfalls to avoid with ${procedureTitle}?`,
        category: 'Best Practices',
        keywords: ['pitfalls', 'avoid', 'mistakes'],
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
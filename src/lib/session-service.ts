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
}

export interface ConversationEntry {
  role: 'ai' | 'user';
  content: string;
}

export interface BatchedQuestion {
  id: string;
  question: string;
  category: string;
  keywords: string[];
  used: boolean;
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
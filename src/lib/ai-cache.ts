import { createHash } from 'crypto';

// In-memory caches for different types of AI responses
const promptCache = new Map<string, any>();
const responseCache = new Map<string, any>();
const templateCache = new Map<string, string>();
const scoringCache = new Map<string, any>(); // New: Cache for scoring results
const audioCache = new Map<string, string>(); // New: Cache for TTS audio

// Cache TTL in milliseconds
const CACHE_TTL = {
  prompts: 60 * 60 * 1000, // 1 hour
  responses: 30 * 60 * 1000, // 30 minutes
  templates: 24 * 60 * 60 * 1000, // 24 hours
  scoring: 20 * 60 * 1000, // 20 minutes for scoring
  audio: 60 * 60 * 1000, // 1 hour for TTS audio
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

// Preloaded prompt templates
const SYSTEM_PROMPTS = {
  topicAnalysis: `You are a fast topic analyzer. Score topics 0-100 based on coverage in the response. Return JSON format.`,
  
  quickDiscovery: `Find 1-2 new important topics mentioned. Be very selective. Return JSON format.`,
  
  questionGeneration: `Generate relevant interview questions based on context. Be specific and targeted. Return valid JSON format.`,
  
  fastClassification: `Classify this response type: overview|technical|safety|process|other. Return JSON format.`,
  
  streamingAnalysis: `Analyze this partial response. What topics are being discussed? Return JSON format.`,
  
  // New: Certification-specific optimized prompts
  certificationScoring: `Score response 1-10 for certification. Consider accuracy, application, clarity. Return JSON with score, feedback, isComplete.`,
  
  quickFeedback: `Provide brief feedback on response quality. 1-2 sentences. JSON format.`,
  
  competencyCheck: `Evaluate competency areas: accuracy, application, communication. Return JSON scores 1-10.`,
  
  adaptiveComplete: `Determine if certification questioning complete based on score and threshold. Return JSON with isComplete boolean.`
};

const QUESTION_TEMPLATES = {
  safety: "What safety considerations are important for {topic}?",
  process: "Can you walk me through the step-by-step process for {topic}?",
  troubleshooting: "What common issues arise with {topic} and how do you handle them?",
  equipment: "What equipment or tools are needed for {topic}?",
  quality: "How do you ensure quality when performing {topic}?",
  preparation: "What preparation is required before starting {topic}?",
  
  // New: Certification-specific question templates
  certSafety: "Explain the safety protocols for {scenario}",
  certApplication: "How would you apply {skill} in {scenario}?",
  certTroubleshooting: "What would you do if {problem} occurred during {scenario}?",
  certProcedure: "Walk me through your approach to {task} in {scenario}",
  certQuality: "How do you ensure quality outcomes when {scenario}?",
  certDecision: "What factors would you consider when deciding {choice} in {scenario}?"
};

// New: Common certification scoring templates
const SCORING_TEMPLATES = {
  excellent: {
    score: 9,
    feedback: "Excellent response demonstrating comprehensive understanding and clear communication.",
    competencyScores: { accuracy: 9, application: 9, communication: 9, problemSolving: 8, completeness: 9 }
  },
  good: {
    score: 7,
    feedback: "Good response showing solid understanding with minor areas for improvement.",
    competencyScores: { accuracy: 7, application: 7, communication: 8, problemSolving: 7, completeness: 7 }
  },
  adequate: {
    score: 5,
    feedback: "Adequate response meeting basic requirements. Consider adding more detail.",
    competencyScores: { accuracy: 5, application: 5, communication: 6, problemSolving: 5, completeness: 5 }
  },
  developing: {
    score: 3,
    feedback: "Response shows some understanding but needs improvement in key areas.",
    competencyScores: { accuracy: 3, application: 3, communication: 4, problemSolving: 3, completeness: 3 }
  }
};

// Initialize caches with preloaded content
export function initializePromptCache() {
  Object.entries(SYSTEM_PROMPTS).forEach(([key, prompt]) => {
    templateCache.set(key, prompt);
  });
  
  Object.entries(QUESTION_TEMPLATES).forEach(([key, template]) => {
    templateCache.set(`question_${key}`, template);
  });
  
  Object.entries(SCORING_TEMPLATES).forEach(([key, template]) => {
    templateCache.set(`scoring_${key}`, JSON.stringify(template));
  });
  
  console.log('AI prompt cache initialized with', templateCache.size, 'templates');
}

// Generate cache key from input
function generateCacheKey(input: any): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return createHash('md5').update(str).digest('hex');
}

// Check if cache entry is still valid
function isCacheValid<T>(entry: CacheEntry<T>, ttl: number): boolean {
  return Date.now() - entry.timestamp < ttl;
}

// Get cached prompt
export function getCachedPrompt(key: string): string | null {
  return templateCache.get(key) || null;
}

// Cache AI response
export function cacheResponse(inputKey: string, response: any): void {
  const key = generateCacheKey(inputKey);
  responseCache.set(key, {
    data: response,
    timestamp: Date.now(),
    hits: 0
  });
  
  // Cleanup old entries periodically
  if (responseCache.size > 1000) {
    cleanupCache(responseCache, CACHE_TTL.responses);
  }
}

// Get cached response
export function getCachedResponse(inputKey: string): any | null {
  const key = generateCacheKey(inputKey);
  const entry = responseCache.get(key);
  
  if (entry && isCacheValid(entry, CACHE_TTL.responses)) {
    entry.hits++;
    return entry.data;
  }
  
  if (entry) {
    responseCache.delete(key);
  }
  
  return null;
}

// New: Cache scoring results
export function cacheScoringResult(inputKey: string, result: any): void {
  const key = generateCacheKey(inputKey);
  scoringCache.set(key, {
    data: result,
    timestamp: Date.now(),
    hits: 0
  });
  
  if (scoringCache.size > 500) {
    cleanupCache(scoringCache, CACHE_TTL.scoring);
  }
}

// New: Get cached scoring result
export function getCachedScoringResult(inputKey: string): any | null {
  const key = generateCacheKey(inputKey);
  const entry = scoringCache.get(key);
  
  if (entry && isCacheValid(entry, CACHE_TTL.scoring)) {
    entry.hits++;
    return entry.data;
  }
  
  if (entry) {
    scoringCache.delete(key);
  }
  
  return null;
}

// New: Cache TTS audio
export function cacheAudio(text: string, audioUrl: string): void {
  const key = generateCacheKey(text);
  audioCache.set(key, audioUrl);
  
  if (audioCache.size > 100) {
    // Keep only the most recently used audio
    const entries = Array.from(audioCache.entries());
    const toDelete = entries.slice(0, entries.length - 100);
    toDelete.forEach(([k]) => audioCache.delete(k));
  }
}

// New: Get cached audio
export function getCachedAudio(text: string): string | null {
  const key = generateCacheKey(text);
  return audioCache.get(key) || null;
}

// Two-stage LLM routing
export function shouldUseFastModel(input: string, context: any): boolean {
  // Use fast model for:
  // - Short responses (< 100 words)
  // - Simple classification tasks
  // - Keyword analysis
  const wordCount = input.split(/\s+/).length;
  const isSimpleTask = context.task === 'classify' || context.task === 'keywords';
  
  return wordCount < 100 || isSimpleTask;
}

// Generate question from template
export function generateQuestionFromTemplate(type: string, topic: string): string {
  const template = templateCache.get(`question_${type}`);
  if (template) {
    return template.replace('{topic}', topic);
  }
  return `Tell me more about ${topic}.`;
}

// Scenario-specific template scoring for short responses
export function shouldUseTemplateScoring(response: string, currentQuestionNumber: number): boolean {
  const wordCount = response.trim().split(/\s+/).length;
  const responseLength = response.trim().length;
  
  // Use template scoring for very short responses or first question basics
  return (wordCount < 15 && responseLength < 80) || 
         (currentQuestionNumber === 1 && wordCount < 25);
}

// Enhanced template scoring that prioritizes content accuracy over length
export function getTemplateScore(response: string, expectedCompetencies?: string[]): any | null {
  const wordCount = response.trim().split(/\s+/).length;
  const lowercaseResponse = response.toLowerCase().trim();
  
  // Add randomization factor for more natural variation (±0.3)
  const randomVariation = () => (Math.random() - 0.5) * 0.6;
  
  // Only catch the most obvious "don't know" responses - let AI handle everything else
  const completelyUnknown = [
    "i don't know", "i have no idea", "no idea", "don't know",
    "i'm not sure", "no clue", "can't say", "idk", "dunno"
  ];
  
  const isCompletelyUnknown = completelyUnknown.some(phrase => 
    lowercaseResponse.includes(phrase)
  );
  
  // Only score extremely short responses that are clearly unhelpful
  if (wordCount < 4 && isCompletelyUnknown) {
    const baseScore = 1.2;
    const finalScore = Math.max(1, Math.min(2, baseScore + randomVariation()));
    
    return {
      responseScore: Math.round(finalScore * 10) / 10,
      competencyScores: { 
        accuracy: Math.max(1, Math.min(2.5, finalScore + randomVariation())), 
        application: Math.max(1, Math.min(2.5, finalScore + randomVariation())), 
        communication: Math.max(1, Math.min(3, finalScore + 0.5 + randomVariation())), 
        problemSolving: Math.max(1, Math.min(2.5, finalScore + randomVariation())), 
        completeness: Math.max(1, Math.min(2, finalScore - 0.3 + randomVariation()))
      },
      feedback: "Try to think through what you do know or what logical steps you might take, even if you're not familiar with the specific topic.",
      isComplete: false,
      reasoningForNext: "Needs to demonstrate some problem-solving approach"
    };
  }
  
  return null; // Use AI scoring for other responses
}

// Smart prompt selection based on context
export function getOptimizedPrompt(task: string, context: any): string {
  const basePrompt = templateCache.get(task);
  if (!basePrompt) return '';
  
  // Add context-specific optimizations
  if (context.streaming) {
    return basePrompt + ' Respond concisely for streaming.';
  }
  
  if (context.priority === 'speed') {
    return basePrompt + ' Be brief and direct.';
  }
  
  return basePrompt;
}

// Cleanup old cache entries
function cleanupCache<T>(cache: Map<string, CacheEntry<T>>, ttl: number): void {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
    }
  }
}

// Preload frequently used responses
export function preloadCommonResponses(): void {
  const commonInputs = [
    'safety overview process',
    'equipment tools needed',
    'step by step procedure',
    'common problems troubleshooting',
    'quality control validation'
  ];
  
  commonInputs.forEach(input => {
    const key = generateCacheKey(input);
    if (!responseCache.has(key)) {
      // Mark as preloaded but empty - will be filled on first real use
      responseCache.set(key, {
        data: null,
        timestamp: Date.now(),
        hits: 0
      });
    }
  });
}

// New: Preload common certification scenarios
export function preloadCertificationScenarios(): void {
  const commonScenarios = [
    'safety protocols',
    'equipment operation',
    'troubleshooting procedures',
    'quality assurance',
    'emergency response',
    'standard operating procedures'
  ];
  
  commonScenarios.forEach(scenario => {
    // Preload scoring patterns
    const scoringKey = generateCacheKey(`cert_scoring_${scenario}`);
    if (!scoringCache.has(scoringKey)) {
      scoringCache.set(scoringKey, {
        data: null,
        timestamp: Date.now(),
        hits: 0
      });
    }
    
    // Preload question patterns
    const questionKey = generateCacheKey(`cert_question_${scenario}`);
    if (!responseCache.has(questionKey)) {
      responseCache.set(questionKey, {
        data: null,
        timestamp: Date.now(),
        hits: 0
      });
    }
  });
}

// Get cache statistics
export function getCacheStats() {
  return {
    prompts: templateCache.size,
    responses: responseCache.size,
    scoring: scoringCache.size,
    audio: audioCache.size,
    totalHits: Array.from(responseCache.values()).reduce((sum, entry) => sum + entry.hits, 0)
  };
}

// Clear caches
export function clearCaches(): void {
  promptCache.clear();
  responseCache.clear();
  scoringCache.clear();
  audioCache.clear();
  // Keep template cache as it contains preloaded content
}

// Clear cache for development (ensure fresh analysis)
export function clearCache() {
  console.log('Clearing response cache...');
  responseCache.clear();
  scoringCache.clear();
  console.log('Cache cleared successfully');
}

// Auto-clear cache in development to ensure fresh analysis (but less frequently)
if (process.env.NODE_ENV !== 'production') {
  // Clear caches every 2 hours in development to reduce noise
  setInterval(() => clearCache(), 2 * 60 * 60 * 1000);
}

// Initialize on module load
initializePromptCache(); 
import { createHash } from 'crypto';

// In-memory caches for different types of AI responses
const promptCache = new Map<string, any>();
const responseCache = new Map<string, any>();
const templateCache = new Map<string, string>();

// Cache TTL in milliseconds
const CACHE_TTL = {
  prompts: 60 * 60 * 1000, // 1 hour
  responses: 30 * 60 * 1000, // 30 minutes
  templates: 24 * 60 * 60 * 1000, // 24 hours
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
  
  streamingAnalysis: `Analyze this partial response. What topics are being discussed? Return JSON format.`
};

const QUESTION_TEMPLATES = {
  safety: "What safety considerations are important for {topic}?",
  process: "Can you walk me through the step-by-step process for {topic}?",
  troubleshooting: "What common issues arise with {topic} and how do you handle them?",
  equipment: "What equipment or tools are needed for {topic}?",
  quality: "How do you ensure quality when performing {topic}?",
  preparation: "What preparation is required before starting {topic}?",
};

// Initialize caches with preloaded content
export function initializePromptCache() {
  Object.entries(SYSTEM_PROMPTS).forEach(([key, prompt]) => {
    templateCache.set(key, prompt);
  });
  
  Object.entries(QUESTION_TEMPLATES).forEach(([key, template]) => {
    templateCache.set(`question_${key}`, template);
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

// Get cache statistics
export function getCacheStats() {
  return {
    prompts: templateCache.size,
    responses: responseCache.size,
    totalHits: Array.from(responseCache.values()).reduce((sum, entry) => sum + entry.hits, 0)
  };
}

// Clear caches
export function clearCaches(): void {
  promptCache.clear();
  responseCache.clear();
  // Keep template cache as it contains preloaded content
}

// Clear cache for development (ensure fresh analysis)
export function clearCache() {
  console.log('Clearing response cache...');
  responseCache.clear();
  console.log('Cache cleared successfully');
}

// Auto-clear cache in development to ensure fresh analysis
if (process.env.NODE_ENV !== 'production') {
  clearCache();
}

// Initialize on module load
initializePromptCache(); 
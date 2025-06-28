/**
 * API Timeout Utility
 * Provides consistent timeout handling for all external API calls
 */

/**
 * Add explicit timeout to any promise
 * This is more reliable than SDK-level timeouts which sometimes don't work
 */
export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number = 15000, 
  errorMessage: string = `API request timeout after ${timeoutMs}ms`
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Wrapper for DeepSeek API calls with consistent timeout and error handling
 */
export const withDeepSeekTimeout = <T>(
  apiCall: Promise<T>, 
  context: string = 'DeepSeek API'
): Promise<T> => {
  return withTimeout(
    apiCall, 
    15000, 
    `${context} request timeout after 15 seconds`
  );
};

/**
 * Wrapper for external API calls with consistent timeout and error handling
 */
export const withExternalApiTimeout = <T>(
  apiCall: Promise<T>, 
  timeoutMs: number = 30000,
  context: string = 'External API'
): Promise<T> => {
  return withTimeout(
    apiCall, 
    timeoutMs, 
    `${context} request timeout after ${timeoutMs}ms`
  );
};

/**
 * Default timeout configurations for different services
 */
export const TIMEOUT_CONFIG = {
  DEEPSEEK: 15000,     // 15 seconds for DeepSeek API
  OPENAI: 30000,       // 30 seconds for OpenAI API
  ELEVENLABS: 30000,   // 30 seconds for ElevenLabs TTS
  WHISPER: 60000,      // 60 seconds for audio transcription
  DATABASE: 10000,     // 10 seconds for database queries
  INTERNAL_API: 5000,  // 5 seconds for internal API calls
} as const; 
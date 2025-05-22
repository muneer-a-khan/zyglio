import { SessionContext } from '@/lib/rag-service';

declare global {
  var sessionStore: Map<string, SessionContext> | undefined;
  
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
} 
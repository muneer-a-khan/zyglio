"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from 'react';
import { 
  initializePromptCache, 
  preloadCommonResponses, 
  preloadCertificationScenarios 
} from '@/lib/ai-cache';
import SystemCheck from "@/components/system-check";
import GlobalNavigation from "@/components/global-navigation";

interface ProvidersProps {
  children: React.ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  
  // Initialize caching system on app start
  useEffect(() => {
    console.log('🚀 Initializing AI cache system...');
    
    // Initialize prompt templates and preload common patterns
    initializePromptCache();
    preloadCommonResponses();
    preloadCertificationScenarios();
    
    console.log('✅ AI cache system initialized');
  }, []);

  return (
    <SessionProvider session={session}>
      <SystemCheck />
      <GlobalNavigation />
      {children}
      <Toaster 
        position="top-right"
        expand={false}
        richColors
        closeButton
      />
    </SessionProvider>
  );
}

// Also export as default for compatibility
export default Providers; 
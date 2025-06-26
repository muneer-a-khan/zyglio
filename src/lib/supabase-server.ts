import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client
let supabase: ReturnType<typeof createClient> | null = null;
let supabaseInitialized = false;

export function getSupabaseServerClient() {
  if (supabaseInitialized) {
    return supabase;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      console.warn('NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables');
      supabase = null;
    } else if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
      supabase = null;
    } else {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Server Supabase client initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize server Supabase client:', error);
    supabase = null;
  }
  
  supabaseInitialized = true;
  return supabase;
} 
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Client-side Supabase client (lazy-loaded)
let supabase: ReturnType<typeof createClient<Database>> | null = null;
let supabaseInitialized = false;

export function getSupabaseClient() {
  if (supabaseInitialized) {
    return supabase;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      console.warn('NEXT_PUBLIC_SUPABASE_URL is not defined');
      supabase = null;
    } else if (!supabaseKey) {
      console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
      supabase = null;
    } else {
      supabase = createClient<Database>(supabaseUrl, supabaseKey);
      console.log('Client Supabase client initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize client Supabase client:', error);
    supabase = null;
  }
  
  supabaseInitialized = true;
  return supabase;
}

// For backward compatibility, export the client getter
export { getSupabaseClient as supabase };
export default getSupabaseClient; 
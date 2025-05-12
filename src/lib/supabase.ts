import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// These environment variables should be set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase; 
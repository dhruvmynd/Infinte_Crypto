import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create client with proper timeouts and retries
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'infinite-crypto' }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Add proper timeouts and retry logic
  httpClient: {
    fetch: (url, options) => {
      const timeout = 15000; // 15 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options?.headers,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      })
      .then(response => {
        clearTimeout(timeoutId);
        return response;
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.error('Supabase fetch error:', error);
        throw error;
      });
    }
  }
});

// Helper function to check if Supabase is connected
export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      throw error;
    }
    console.log('Supabase connection successful');
    return { connected: true, error: null };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { connected: false, error };
  }
};

// Helper function to handle common database errors
export const handleDatabaseError = (error: any, fallbackMessage: string = 'Database operation failed') => {
  console.error('Database error:', error);
  
  // Handle specific error codes
  if (error?.code === '23505') {
    return 'A record with this information already exists.';
  }
  
  if (error?.code === '23503') {
    return 'This operation references a record that does not exist.';
  }
  
  if (error?.code === '42P01') {
    return 'The requested table does not exist.';
  }
  
  // Return the error message or a fallback
  return error?.message || fallbackMessage;
};
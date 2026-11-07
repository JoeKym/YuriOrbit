import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase is optional. Without it the app still works: sign-in is disabled and
 * the library falls back to local storage.
 *
 * IMPORTANT: never throw at module scope in this file. It is imported by the app
 * entry graph (App -> AuthProvider -> supabase), so a throw here happens before
 * React mounts and renders the whole site blank, even though index.html and the
 * JS bundle both load with HTTP 200.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[YuriOrbit] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
        'Sign-in is disabled and the library stays local to this browser.'
    );
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('[YuriOrbit] Failed to initialise the Supabase client:', err);
    return null;
  }
}

export const supabase = createSupabaseClient();

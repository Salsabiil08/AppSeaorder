import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's current dashboard calls this a publishable key; older projects
// still expose it as an anon key. Both are valid client-side API keys.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The app can run with its local-storage fallback when Supabase credentials
// are intentionally absent (for example, preview deployments).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A paused or unreachable project must not leave checkout waiting forever.
// The service layer catches this error and displays a retry message instead.
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  { global: { fetch: fetchWithTimeout } }
);

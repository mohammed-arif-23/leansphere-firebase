import { createClient } from '@supabase/supabase-js';

const IT_SUPABASE_URL = process.env.IT_SUPABASE_URL as string | undefined;
const IT_SUPABASE_ANON_KEY = process.env.IT_SUPABASE_ANON_KEY as string | undefined;
const IT_SUPABASE_SERVICE_ROLE_KEY = process.env.IT_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!IT_SUPABASE_URL) {
  console.warn('[itSupabase] IT_SUPABASE_URL is not set. IT Panel sync will not work until configured.');
}

// Prefer service role for read access if provided, else fall back to anon
const key = IT_SUPABASE_SERVICE_ROLE_KEY || IT_SUPABASE_ANON_KEY;

export const itSupabase = IT_SUPABASE_URL && key
  ? createClient(IT_SUPABASE_URL, key)
  : undefined;

export function ensureItSupabaseConfigured() {
  if (!itSupabase) {
    const missing: string[] = [];
    if (!IT_SUPABASE_URL) missing.push('IT_SUPABASE_URL');
    if (!IT_SUPABASE_ANON_KEY && !IT_SUPABASE_SERVICE_ROLE_KEY) missing.push('IT_SUPABASE_ANON_KEY or IT_SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`[itSupabase] Missing env: ${missing.join(', ')}`);
  }
}

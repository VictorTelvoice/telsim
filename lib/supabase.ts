import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Cliente Supabase para el frontend (auth, RLS). Una sola instancia para evitar LockManager timeout y doble inicialización. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const DEFAULT_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

const finalUrl = supabaseUrl || DEFAULT_URL;
const finalKey = supabaseAnonKey || DEFAULT_KEY;

export const isDemoMode = !supabaseUrl && window.location.hostname === 'localhost';

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

const GLOBAL_SUPABASE_KEY = '__telsim_supabase_client';

function getSupabase(): SupabaseClient {
  if (typeof globalThis !== 'undefined' && (globalThis as any)[GLOBAL_SUPABASE_KEY]) {
    return (globalThis as any)[GLOBAL_SUPABASE_KEY];
  }
  const client = createClient(finalUrl, finalKey, {
    global: { fetch: noStoreFetch },
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Deshabilita el lock exclusivo que causa timeout de 10s
      lock: undefined as unknown as any,
    },
  });
  if (typeof globalThis !== 'undefined') {
    (globalThis as any)[GLOBAL_SUPABASE_KEY] = client;
  }
  return client;
}

export const supabase = getSupabase();

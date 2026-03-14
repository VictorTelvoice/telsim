import { createClient } from '@supabase/supabase-js';

/** Cliente Supabase para el frontend (auth, RLS). Compatible con admin_settings (id, content). */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const DEFAULT_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

const finalUrl = supabaseUrl || DEFAULT_URL;
const finalKey = supabaseAnonKey || DEFAULT_KEY;

export const isDemoMode = !supabaseUrl && window.location.hostname === 'localhost';

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

export const supabase = createClient(finalUrl, finalKey, {
  global: { fetch: noStoreFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'telsim-auth-session',
    storage: window.localStorage,
  },
});

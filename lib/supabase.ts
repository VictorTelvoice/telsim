import { createClient } from '@supabase/supabase-js';

// Mantiene los valores originales (env + fallback), solo se añade configuración de auth.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://blujavukpveehdkpwfsq.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    detectSessionInUrl: true,   // ← CRÍTICO: procesa ?code= de OAuth
    flowType: 'pkce',
  },
});

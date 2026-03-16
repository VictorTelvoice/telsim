import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://blujavukpveehdkpwfsq.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

// Implementación de lock que NO usa Navigator.locks (evita el timeout de 10s)
// que ocurre cuando hay múltiples pestañas o el lock queda atrapado.
const noopLock: (name: string, acquireOptions: { mode: string }, fn: () => Promise<unknown>) => Promise<unknown> =
  (_name, _opts, fn) => fn();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    lock: noopLock as any,
  },
});

import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env ?? {};
const isLocal = typeof window !== 'undefined' && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
                env.VITE_LOCAL_REPLICA === 'true';

const DEFAULT_SUPABASE_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const LOCAL_SUPABASE_URL = 'http://localhost:3001';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

const SUPABASE_URL = isLocal ? LOCAL_SUPABASE_URL : (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (isLocal) {
  console.log('🔌 Telsim Dashboard Conectado a RÉPLICA LOCAL (Docker)');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true, // auth v2
    detectSessionInUrl: true,
    flowType: 'pkce',
    autoRefreshToken: true,
  },
});

// Interceptor global: limpiar estado al cerrar sesión
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    if (typeof window === 'undefined') return;
    [
      'selected_plan', 'selected_billing', 'selected_plan_annual',
      'post_login_redirect', 'selected_plan_price_id', 'selected_plan_price',
    ].forEach(k => localStorage.removeItem(k));
    const hash = window.location.hash;
    if (hash.includes('/auth/callback')) return;
    if (hash.includes('/web') || hash.includes('/dashboard') || hash.includes('/admin')) {
      window.location.hash = '/login';
    }
  }
});

import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env ?? {};
const SUPABASE_URL =
  env.VITE_SUPABASE_URL || 'https://blujavukpveehdkpwfsq.supabase.co';
const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

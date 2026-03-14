import { createClient } from '@supabase/supabase-js';

/**
 * Almacenamiento híbrido: localStorage primero, fallback a sessionStorage.
 * En PWA en iOS Safari, localStorage puede limpiarse al cerrar la app;
 * sessionStorage permite recuperar la sesión cuando esté disponible.
 */
const hybridStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return sessionStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
    sessionStorage.removeItem(key);
  },
};

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
    storageKey: 'telsim-auth',
    storage: hybridStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

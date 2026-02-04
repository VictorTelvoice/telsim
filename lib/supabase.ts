import { createClient } from '@supabase/supabase-js';

/**
 * Adaptador de almacenamiento personalizado para manejar QuotaExceededError.
 * Si localStorage falla, los datos se mantienen en memoria durante la sesión.
 */
const memoryStorage: Record<string, string> = {};

const customStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) || memoryStorage[key] || null;
    } catch {
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Si el almacenamiento está lleno (QuotaExceededError), guardamos en memoria
      console.warn("Storage quota exceeded, falling back to memory for key:", key);
      memoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // No hacer nada
    }
    delete memoryStorage[key];
  },
};

const env = (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY;

const DEFAULT_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const DEFAULT_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

const finalUrl = supabaseUrl || DEFAULT_URL;
const finalKey = supabaseAnonKey || DEFAULT_KEY;

console.log("--- TELSIM CONNECTION DIAGNOSTIC ---");
console.log("Environment:", env ? "VITE_ENV_LOADED" : "NO_VITE_ENV");
console.log("Storage Strategy: Resilient Hybrid (Local+Memory)");
console.log("------------------------------------");

export const isDemoMode = !supabaseUrl && window.location.hostname === 'localhost';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

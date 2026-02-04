import { createClient } from '@supabase/supabase-js';

// Credenciales de respaldo (Fallback)
const FALLBACK_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const FALLBACK_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

// En Vite, se debe usar import.meta.env para acceder a las variables VITE_*
// Fix: Se usa casting a 'any' para evitar el error de TypeScript: Property 'env' does not exist on type 'ImportMeta'.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

// Log de depuración seguro (solo muestra el inicio de las claves)
console.log("TELSIM Cloud Sync:");
console.log("URL:", supabaseUrl ? `${supabaseUrl.substring(0, 12)}...` : "MISSING");
console.log("Key:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...` : "MISSING");

// Flag para modo demo si no hay configuración válida
export const isDemoMode = !supabaseUrl || supabaseUrl.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
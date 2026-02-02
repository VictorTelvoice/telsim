import { createClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables from available global objects.
 */
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  try {
    const meta = import.meta as any;
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {}

  return '';
};

// Real Credentials provided by user
const REAL_URL = 'https://blujavukpveehdkpwfsq.supabase.co';
const REAL_KEY = 'sb_publishable_WFpd0btkMWrv_9IW0mcANQ_kFSPScD7';

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || REAL_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || REAL_KEY;

// Flag to check if we are still using placeholders
export const isDemoMode = !supabaseUrl || supabaseUrl.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

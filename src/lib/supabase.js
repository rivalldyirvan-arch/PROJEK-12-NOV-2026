import { createClient } from '@supabase/supabase-js';

// Retrieve credentials: prioritize .env, fallback to localStorage
const getStoredCredentials = () => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  const localUrl = (localStorage.getItem('app_supabase_url') || '').trim();
  const localKey = (localStorage.getItem('app_supabase_key') || '').trim();

  return {
    url: envUrl || localUrl || '',
    key: envKey || localKey || ''
  };
};

let clientInstance = null;
let currentUrl = '';
let currentKey = '';

export const getSupabase = () => {
  const { url, key } = getStoredCredentials();
  
  if (!url || !key) {
    return null;
  }

  // Re-instantiate if credentials changed
  if (!clientInstance || currentUrl !== url || currentKey !== key) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      currentUrl = url;
      currentKey = key;
    } catch (err) {
      console.warn('Gagal menginisialisasi client Supabase:', err);
      return null;
    }
  }

  return clientInstance;
};

export const saveSupabaseCredentials = (url, key) => {
  if (url) localStorage.setItem('app_supabase_url', url.trim());
  else localStorage.removeItem('app_supabase_url');

  if (key) localStorage.setItem('app_supabase_key', key.trim());
  else localStorage.removeItem('app_supabase_key');

  clientInstance = null; // force re-create
  return getSupabase();
};

export const getActiveSupabaseConfig = () => {
  return getStoredCredentials();
};

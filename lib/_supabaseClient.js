// lib/_supabaseClient.js
import { createClient } from '@supabase/supabase-js';

let adminInstance = null;

export function supabaseAdmin() {
  if (!adminInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        '[supabaseClient] Faltan variables de entorno: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    adminInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminInstance;
}

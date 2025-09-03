import { createClient } from '@supabase/supabase-js';

/**
 * Retorna un cliente de Supabase con privilegios de administrador (Service Role Key)
 * para poder insertar tokens de acceso y otras operaciones seguras.
 */
export function supabaseAdmin() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Faltan variables de entorno de Supabase. Revisa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
    throw new Error("Supabase no está configurado correctamente");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { 'x-client-info': 'bold-webhook' } }
  });
}

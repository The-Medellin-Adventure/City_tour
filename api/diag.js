// api/diag.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    let dbOk = false;
    let dbError = null;

    try {
      const sb = supabaseAdmin();
      const { error } = await sb.from('access_tokens').select('count', { head: true, count: 'exact' });
      dbOk = !error;
      dbError = error?.message || null;
    } catch (err) {
      dbError = err.message;
    }

    res.status(200).json({
      ok: true,
      env: {
        SUPABASE_URL: hasUrl,
        SUPABASE_SERVICE_ROLE_KEY: hasKey
      },
      db: {
        canSelectAccessTokens: dbOk,
        error: dbError
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

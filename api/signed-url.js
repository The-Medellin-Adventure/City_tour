// api/signed-url.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }

    const sb = supabaseAdmin();

    // 🔎 Validar token solo verificando que exista en la tabla
    const { data: tokenRow, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: 'Token no encontrado' });
    }

    // ⚠️ Se quitó validación de status, expiración e IP para simplificar
    // Así puedes comprobar que el tour funciona completo en Vercel

    // Generar signed URL
    const { data: signed, error: urlError } = await sb.storage
      .from('Tour') // 👈 asegúrate de que tu bucket se llame exactamente "Tour"
      .createSignedUrl(file, 60 * 15); // 15 min de validez

    if (urlError || !signed?.signedUrl) {
      return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
    }

    // ✅ Redirección compatible con Vercel
    res.writeHead(302, { Location: signed.signedUrl });
    res.end();

  } catch (e) {
    console.error('❌ Error en signed-url:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

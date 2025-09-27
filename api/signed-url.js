// api/signed-url.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }

    const sb = supabaseAdmin();

    // 1️⃣ Buscar token
    const { data: tokenRow, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: 'Token inválido' });
    }

    const now = new Date();

    // ===============================
    // 2️⃣ Excepción: token "democris"
    // ===============================
    if (tokenRow.token === 'democris') {
      // Token permanente, multi-dispositivo
      const { data: signed, error: urlError } = await sb.storage
        .from('Tour')
        .createSignedUrl(file, 60 * 15); // 15 min

      if (urlError || !signed?.signedUrl) {
        return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
      }

      return res.status(200).json({ ok: true, signedUrl: signed.signedUrl });
    }

    // ===============================
    // 3️⃣ Verificar expiración
    // ===============================
    if (tokenRow.expires_at) {
      const exp = new Date(tokenRow.expires_at);
      if (now > exp || tokenRow.status === 'expired') {
        return res.status(403).json({ ok: false, error: 'Token caducado' });
      }
    }

    // ===============================
    // 4️⃣ Bloquear segundo dispositivo/navegador
    // ===============================
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
      // Primer uso → asignar IP, navegador y expiración dinámica
      await sb
        .from('access_tokens')
        .update({
          first_ip: ip,
          first_user_agent: userAgent,
          used_at: new Date().toISOString(),
          status: 'used',
          // Expira 1 hora desde el primer uso
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
        .eq('token', token);
    } else {
      // Ya usado → verificar que sea el mismo dispositivo/navegador
      if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== userAgent) {
        return res.status(403).json({
          ok: false,
          error: 'El token ya fue usado en otro dispositivo o navegador',
        });
      }
    }

    // ===============================
    // 5️⃣ Generar signed URL temporal (15 minutos)
    // ===============================
    const { data: signed, error: urlError } = await sb.storage
      .from('Tour')
      .createSignedUrl(file, 60 * 15); // 15 min

    if (urlError || !signed?.signedUrl) {
      return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
    }

    // ===============================
    // 6️⃣ Devolver respuesta
    // ===============================
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ ok: true, signedUrl: signed.signedUrl });
    } else {
      res.writeHead(302, { Location: signed.signedUrl });
      res.end();
    }

  } catch (e) {
    console.error('❌ Error en signed-url:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

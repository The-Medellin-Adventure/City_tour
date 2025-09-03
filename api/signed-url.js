// api/signed-url.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }

    const sb = supabaseAdmin();

    // Buscar token válido
    const { data: tokenRow, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: 'Token inválido o expirado' });
    }

    // Capturar IP y User-Agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Si es el primer uso, registrar IP y User-Agent
    if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
      const { error: updateError } = await sb
        .from('access_tokens')
        .update({
          first_ip: ip,
          first_user_agent: userAgent,
          used_at: new Date().toISOString(),
        })
        .eq('token', token);

      if (updateError) {
        console.error('❌ Error registrando primer uso:', updateError);
      }
    } else {
      // Si ya tiene registro, comparar
      if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== userAgent) {
        return res.status(403).json({
          ok: false,
          error: 'El token ya fue usado en otro dispositivo o navegador',
        });
      }
    }

    // Generar signed URL de Supabase
    const { data, error: urlError } = await sb.storage
      .from('Tour')
      .createSignedUrl(file, 60 * 15); // 15 min

    if (urlError || !data?.signedUrl) {
      return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
    }

    // Redirigir al recurso
    return res.redirect(302, data.signedUrl);

  } catch (e) {
    console.error('Error en signed-url:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

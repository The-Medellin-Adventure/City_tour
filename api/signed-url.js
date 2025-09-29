```js
import { supabaseAdmin } from './_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros' });
    }

    const sb = supabaseAdmin();

    // 1️⃣ Buscar token en la base
    const { data: tokenRow, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: 'Token inválido' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ===============================
    // 2️⃣ Token DEMOCRIS → libre, multi-equipo, sin límite de tiempo
    // ===============================
    if (tokenRow.token === 'democris') {
      const { data: signed, error: urlError } = await sb.storage
        .from('Tour')
        .createSignedUrl(file, 60 * 15);

      if (urlError || !signed?.signedUrl) {
        return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
      }

      return res.status(200).json({ ok: true, signedUrl: signed.signedUrl });
    }

    // ===============================
    // 3️⃣ Token DEMOPRINCE → sin límite de tiempo, PERO un solo equipo
    // ===============================
    if (tokenRow.token === 'demoprince') {
      if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
        await sb
          .from('access_tokens')
          .update({
            first_ip: ip,
            first_user_agent: userAgent,
            used_at: new Date().toISOString(),
            status: 'used'
          })
          .eq('token', token);
      } else {
        if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== userAgent) {
          return res.status(403).json({
            ok: false,
            error: 'El token ya fue usado en otro dispositivo o navegador',
          });
        }
      }

      const { data: signed, error: urlError } = await sb.storage
        .from('Tour')
        .createSignedUrl(file, 60 * 15);

      if (urlError || !signed?.signedUrl) {
        return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
      }

      return res.status(200).json({ ok: true, signedUrl: signed.signedUrl });
    }

    // ===============================
    // 4️⃣ Token normal → acceso único, 1 hora desde primer uso
    // ===============================
    const now = new Date();

    if (tokenRow.expires_at) {
      const exp = new Date(tokenRow.expires_at);
      if (now > exp || tokenRow.status === 'expired') {
        return res.status(403).json({ ok: false, error: 'Token caducado' });
      }
    }

    if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
      await sb
        .from('access_tokens')
        .update({
          first_ip: ip,
          first_user_agent: userAgent,
          used_at: new Date().toISOString(),
          status: 'used',
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
        .eq('token', token);
    } else {
      if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== userAgent) {
        return res.status(403).json({
          ok: false,
          error: 'El token ya fue usado en otro dispositivo o navegador',
        });
      }
    }

    const { data: signed, error: urlError } = await sb.storage
      .from('Tour')
      .createSignedUrl(file, 60 * 15);

    if (urlError || !signed?.signedUrl) {
      return res.status(500).json({ ok: false, error: 'No se pudo generar signedUrl' });
    }

    return res.status(200).json({ ok: true, signedUrl: signed.signedUrl });

  } catch (e) {
    console.error('❌ Error en signed-url:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
```

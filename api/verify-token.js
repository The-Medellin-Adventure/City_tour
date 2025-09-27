// api/verify-token.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const token = req.query.token?.toString();
    if (!token) return res.status(400).json({ ok: false, error: 'Falta token' });

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .toString()
      .split(',')[0]
      .trim();
    const ua = (req.headers['user-agent'] || '').toString();

    const sb = supabaseAdmin();
    const { data: rows, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (error) throw error;
    const row = rows?.[0];
    if (!row) return res.status(403).json({ ok: false, error: 'Token inválido' });

    // ===============================
    // 1️⃣ Excepción: token "democris"
    // ===============================
    if (row.token === 'democris') {
      return res.json({ ok: true, message: 'Token permanente (democris)' });
    }

    const now = new Date();

    // ===============================
    // 2️⃣ Verificar expiración
    // ===============================
    if (row.expires_at) {
      const exp = new Date(row.expires_at);
      if (now > exp || row.status === 'expired') {
        // Expira si ya pasó el tiempo
        await sb.from('access_tokens').update({ status: 'expired' }).eq('id', row.id);
        return res.status(403).json({ ok: false, error: 'Token caducado' });
      }
    }

    // ===============================
    // 3️⃣ Token ya usado
    // ===============================
    if (row.used_at) {
      // Solo permitir si es el mismo dispositivo/navegador
      if (row.first_ip !== ip || row.first_user_agent !== ua) {
        return res.status(403).json({ ok: false, error: 'Token ya usado en otro dispositivo/navegador' });
      }
      return res.json({ ok: true });
    }

    // ===============================
    // 4️⃣ Primer uso
    // ===============================
    await sb
      .from('access_tokens')
      .update({
        used_at: new Date().toISOString(),
        first_ip: ip,
        first_user_agent: ua,
        status: 'used',
        // Expira 1 hora después del primer uso
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
      .eq('id', row.id);

    return res.json({ ok: true, message: 'Token activado, válido por 1 hora desde ahora' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}


return res.json({ ok: true });
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}

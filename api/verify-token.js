// api/verify-token.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const token = req.query.token?.toString();
    if (!token) {
      console.error("❌ No se envió token en la query");
      return res.status(400).json({ ok: false, error: 'Falta token' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .toString()
      .split(',')[0]
      .trim();
    const ua = (req.headers['user-agent'] || '').toString();

    console.log("🔎 Verificando token:", token);
    console.log("🌐 IP detectada:", ip);
    console.log("🖥️ User-Agent:", ua);

    const sb = supabaseAdmin();
    const { data: rows, error } = await sb
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (error) {
      console.error("❌ Error consultando Supabase:", error);
      throw error;
    }

    const row = rows?.[0];
    console.log("📦 Row devuelto de Supabase:", row);

    if (!row) {
      console.error("❌ Token no encontrado en la base de datos");
      return res.status(403).json({ ok: false, error: 'Token inválido' });
    }

    // ===============================
    // 1️⃣ Excepción: token "democris"
    // ===============================
    if (row.token === 'democris') {
      console.log("✅ Token permanente (democris), acceso permitido");
      return res.json({ ok: true, message: 'Token permanente (democris)' });
    }

    const now = new Date();
    console.log("⏰ Fecha actual:", now.toISOString());

    // ===============================
    // 2️⃣ Verificar expiración
    // ===============================
    if (row.expires_at) {
      const exp = new Date(row.expires_at);
      console.log("⏳ Expira en:", exp.toISOString());

      if (now > exp || row.status === 'expired') {
        console.warn("⚠️ Token caducado:", row.token);
        await sb.from('access_tokens').update({ status: 'expired' }).eq('id', row.id);
        return res.status(403).json({ ok: false, error: 'Token caducado' });
      }
    } else {
      console.log("ℹ️ Token sin fecha de expiración (NULL en BD)");
    }

    // ===============================
    // 3️⃣ Token ya usado
    // ===============================
    if (row.used_at) {
      console.log("🔐 Token ya usado en:", row.used_at);
      if (row.first_ip !== ip || row.first_user_agent !== ua) {
        console.warn("⚠️ Token usado en otro dispositivo/navegador");
        return res.status(403).json({ ok: false, error: 'Token ya usado en otro dispositivo/navegador' });
      }
      console.log("✅ Token usado pero válido en el mismo dispositivo");
      return res.json({ ok: true });
    }

    // ===============================
    // 4️⃣ Primer uso
    // ===============================
    console.log("🚀 Primer uso del token, activando expiración 1h");
    await sb
      .from('access_tokens')
      .update({
        used_at: new Date().toISOString(),
        first_ip: ip,
        first_user_agent: ua,
        status: 'used',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
      .eq('id', row.id);

    console.log("✅ Token activado correctamente");

    return res.json({ ok: true, message: 'Token activado, válido por 1 hora desde ahora' });
  } catch (e) {
    console.error("❌ Error en verify-token:", e);
    return res.status(500).json({
      ok: false,
      error: e.message,
      detail: e.stack
    });
  }
}

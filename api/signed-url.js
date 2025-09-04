// api/signed-url.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;
    if (!file || !token) {
      return res.status(400).json({ ok: false, error: "Faltan parámetros" });
    }

    const sb = supabaseAdmin();

    // 1. Validar token: activo y no vencido
    const { data: tokenRow, error } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: "Token inválido o expirado" });
    }

    // 2. Controlar primer dispositivo
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
      // Primer uso → guardar huella
      await sb
        .from("access_tokens")
        .update({
          first_ip: ip,
          first_user_agent: userAgent,
          used_at: new Date().toISOString()
        })
        .eq("token", token);
    } else if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== userAgent) {
      // Segundo dispositivo → bloquear
      return res.status(403).json({ ok: false, error: "El token ya fue usado en otro dispositivo" });
    }

    // 3. Generar signed URL (15 minutos)
    const { data: signed, error: urlError } = await sb.storage
      .from("Tour")
      .createSignedUrl(file, 60 * 15);

    if (urlError || !signed?.signedUrl) {
      return res.status(500).json({ ok: false, error: "No se pudo generar signedUrl" });
    }

    // 4. Redirección al recurso real
    res.writeHead(302, { Location: signed.signedUrl });
    res.end();
  } catch (e) {
    console.error("❌ Error en signed-url:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

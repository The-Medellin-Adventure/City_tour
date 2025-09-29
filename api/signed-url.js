import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).json({ ok: false, error: "Faltan parámetros" });
    }

    const sb = supabaseAdmin();

    // 🔑 Bypass DEMOCRIS → acceso libre, multi-equipo
    if (token === "democris") {
      console.log("✅ DEMOCRIS acceso libre:", file);
      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, signedUrl: data.signedUrl });
    }

    // 🔑 Bypass DEMOPRINCE → sin límite de tiempo, un solo equipo
    if (token === "demoprince") {
      console.log("✅ DEMOPRINCE acceso único equipo:", file);
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const ua = req.headers["user-agent"] || "unknown";

      const { data: row } = await sb.from("access_tokens").select("*").eq("token", token).single();

      if (row && row.first_ip && row.first_user_agent) {
        if (row.first_ip !== ip || row.first_user_agent !== ua) {
          return res.status(403).json({ ok: false, error: "Token en otro dispositivo" });
        }
      } else {
        await sb.from("access_tokens").update({
          first_ip: ip,
          first_user_agent: ua,
          used_at: new Date().toISOString(),
        }).eq("token", token);
      }

      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true, signedUrl: data.signedUrl });
    }

    // ⬇️ Para los demás, validación normal
    const { data: tokenRow, error } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: "Token inválido" });
    }

    // Validar expiración
    const now = new Date();
    if (tokenRow.expires_at && now > new Date(tokenRow.expires_at)) {
      return res.status(403).json({ ok: false, error: "Token caducado" });
    }

    const { data, error: urlError } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
    if (urlError) return res.status(500).json({ ok: false, error: urlError.message });

    return res.status(200).json({ ok: true, signedUrl: data.signedUrl });

  } catch (e) {
    console.error("❌ Error en signed-url:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

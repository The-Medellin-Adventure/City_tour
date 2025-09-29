import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Falta token" });
    }

    // 🔑 Bypass directo para tokens especiales
    if (token === "democris") {
      console.log("✅ Token DEMOCRIS detectado");
      return res.status(200).json({ ok: true, type: "democris" });
    }

    if (token === "demoprince") {
      console.log("✅ Token DEMOPRINCE detectado");
      return res.status(200).json({ ok: true, type: "demoprince" });
    }

    // ⬇️ Para el resto, sí consulta Supabase
    const sb = supabaseAdmin();
    const { data: tokenRow, error } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: "Token inválido" });
    }

    // Verificar expiración
    if (tokenRow.expires_at) {
      const now = new Date();
      const exp = new Date(tokenRow.expires_at);
      if (now > exp || tokenRow.status === "expired") {
        return res.status(403).json({ ok: false, error: "Token caducado" });
      }
    }

    return res.status(200).json({ ok: true, type: "normal" });

  } catch (e) {
    console.error("❌ Error en verify-token:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

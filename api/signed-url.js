import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      return res.status(400).send("Faltan parámetros");
    }

    const sb = supabaseAdmin();

    // DEMOCRIS → acceso libre
    if (token === "democris") {
      console.log("✅ DEMOCRIS acceso libre:", file);
      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error || !data || !data.signedUrl) {
        console.error("❌ Error DEMOCRIS signed-url:", error);
        return res.status(500).send("Error al generar URL DEMOCRIS");
      }
      return res.redirect(302, data.signedUrl);
    }

    // DEMOPRINCE → un solo dispositivo
    if (token === "demoprince") {
      console.log("✅ DEMOPRINCE acceso único equipo:", file);
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const ua = req.headers["user-agent"] || "unknown";

      const { data: row } = await sb.from("access_tokens").select("*").eq("token", token).single();

      if (row && row.first_ip && row.first_user_agent) {
        if (row.first_ip !== ip || row.first_user_agent !== ua) {
          return res.status(403).send("Token en otro dispositivo");
        }
      } else {
        await sb.from("access_tokens").update({
          first_ip: ip,
          first_user_agent: ua,
          used_at: new Date().toISOString(),
        }).eq("token", token);
      }

      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error || !data || !data.signedUrl) {
        console.error("❌ Error DEMOPRINCE signed-url:", error);
        return res.status(500).send("Error al generar URL DEMOPRINCE");
      }
      return res.redirect(302, data.signedUrl);
    }

    // TOKENS NORMALES
    const { data: tokenRow, error } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).send("Token inválido");
    }

    // Verificar expiración
    const now = new Date();
    if (tokenRow.expires_at && now > new Date(tokenRow.expires_at)) {
      return res.status(403).send("Token caducado");
    }
    if (tokenRow.status === "expired") {
      return res.status(403).send("Token expirado");
    }

    const { data, error: urlError } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
    if (urlError || !data || !data.signedUrl) {
      console.error("❌ Error NORMAL signed-url:", urlError);
      return res.status(500).send("Error al generar URL");
    }

    return res.redirect(302, data.signedUrl);

  } catch (e) {
    console.error("❌ Error general en signed-url:", e);
    return res.status(500).send("Error interno del servidor");
  }
}

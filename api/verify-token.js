```js
// api/signed-url.js
import { supabaseAdmin } from './_supabaseClient.js';

export default async function handler(req, res) {
  console.log("📥 signed-url invocado:", req.query);

  try {
    const { token, file } = req.query;

    if (!token || !file) {
      return res.status(400).json({ error: "Faltan parámetros token o file" });
    }

    const sb = supabaseAdmin();

    // Buscar token en la base de datos
    const { data: tokenRow, error: tokenError } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      console.error("❌ Token no encontrado:", token, tokenError);
      return res.status(403).json({ error: "Token inválido" });
    }

    console.log("🔑 Token encontrado:", tokenRow);

    // Caso DEMOCRIS → acceso ilimitado
    if (tokenRow.token === "democris") {
      console.log("✅ Token democris, acceso ilimitado");
    }

    // Caso DEMOPRINCE → acceso ilimitado en tiempo, restringido a un dispositivo
    if (tokenRow.token === "demoprince") {
      console.log("✅ Token demoprince detectado. first_ip:", tokenRow.first_ip, "UA:", tokenRow.first_user_agent);

      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const ua = req.headers["user-agent"] || "unknown";

      if (!tokenRow.first_ip || !tokenRow.first_user_agent) {
        await sb.from("access_tokens")
          .update({ first_ip: ip, first_user_agent: ua, used_at: new Date().toISOString() })
          .eq("id", tokenRow.id);
        console.log("🔐 Primer uso de demoprince registrado");
      } else if (tokenRow.first_ip !== ip || tokenRow.first_user_agent !== ua) {
        console.warn("🚫 Acceso bloqueado: dispositivo distinto");
        return res.status(403).json({ error: "Token en uso en otro dispositivo" });
      }
    }

    // Tokens normales → expiran después de 1h tras primer uso
    if (tokenRow.type === "single") {
      const now = new Date();
      if (!tokenRow.used_at) {
        const exp = new Date(now.getTime() + 60 * 60 * 1000); // +1h
        await sb.from("access_tokens")
          .update({ used_at: now.toISOString(), expires_at: exp.toISOString() })
          .eq("id", tokenRow.id);
        console.log("⏳ Token single, primer uso, expira:", exp.toISOString());
      } else if (tokenRow.expires_at && now > new Date(tokenRow.expires_at)) {
        console.warn("🚫 Token expirado");
        return res.status(403).json({ error: "Token expirado" });
      }
    }

    // Generar Signed URL desde Supabase Storage
    const { data: signed, error: signedError } = await sb.storage
      .from("Tour")
      .createSignedUrl(file, 60 * 60); // válido 1h

    if (signedError) {
      console.error("❌ Error creando signed URL:", signedError);
      return res.status(500).json({ error: "No se pudo generar signed URL" });
    }

    console.log("📤 Signed URL generado para:", file);
    return res.status(200).json({ signedUrl: signed.signedUrl });

  } catch (e) {
    console.error("❌ Error inesperado en signed-url:", e);
    return res.status(500).json({ error: e.message });
  }
}


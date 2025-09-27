import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ ok: false, error: "Falta el token" });
    }

    // Buscar token en la tabla
    const { data: tokenRow, error } = await supabaseAdmin
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: "Token no válido" });
    }

    // Excepciones de tokens especiales
    if (tokenRow.token === "democris") {
      return await responderConSignedURLs(res, "Token permanente (democris)");
    }

    if (tokenRow.token === "demoprince") {
      // (Si quieres aquí mantener la lógica de control de dispositivo/IP/UA)
      return await responderConSignedURLs(res, "Token permanente (demoprince, control de dispositivo)");
    }

    // Tokens normales
    const now = new Date();
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < now) {
      return res.status(403).json({ ok: false, error: "Token expirado" });
    }

    // Si nunca se usó → marcar primera vez y fijar vencimiento en 1 hora
    if (!tokenRow.used_at) {
      const usedAt = new Date();
      const expiresAt = new Date(usedAt.getTime() + 60 * 60 * 1000); // 1 hora

      await supabaseAdmin
        .from("access_tokens")
        .update({ used_at: usedAt.toISOString(), expires_at: expiresAt.toISOString() })
        .eq("id", tokenRow.id);
    }

    return await responderConSignedURLs(res, "Token válido");

  } catch (err) {
    console.error("Error en verify-token:", err);
    return res.status(500).json({ ok: false, error: "Error verificando token" });
  }
}

/**
 * Genera signed URLs de Supabase y responde al cliente
 */
async function responderConSignedURLs(res, mensaje) {
  try {
    // ⚠️ Cambia 'videos' e 'imagenes' por el nombre real de tus buckets en Supabase
    const { data: signedVideo } = await supabaseAdmin
      .storage
      .from("videos")
      .createSignedUrl("intro.mp4", 60 * 60); // válido 1h

    const { data: signedImage } = await supabaseAdmin
      .storage
      .from("imagenes")
      .createSignedUrl("portada.jpg", 60 * 60);

    return res.status(200).json({
      ok: true,
      message: mensaje,
      urls: {
        videoIntro: signedVideo?.signedUrl,
        portada: signedImage?.signedUrl
      }
    });
  } catch (e) {
    console.error("Error creando signed URLs:", e);
    return res.status(200).json({ ok: true, message: mensaje, urls: {} });
  }
}

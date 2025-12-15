// api/signed-url.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { file, token } = req.query;

    if (!file || !token) {
      console.error("[SIGNED-URL] Faltan parámetros", { file, token });
      res.statusCode = 400;
      return res.end("Faltan parámetros");
    }

    const sb = supabaseAdmin();

    // Helper para redirigir de forma robusta (serverless)
    function redirectTo(url) {
      res.writeHead(302, { Location: url });
      return res.end();
    }

    // DEMOCRIS → acceso libre
    if (token === "democris") {
      console.log("[SIGNED-URL] DEMOCRIS acceso libre", { file });
      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error || !data || !data.signedUrl) {
        console.error("[SIGNED-URL] DEMOCRIS ERR:", error, "file:", file);
        res.statusCode = 404;
        return res.end("No existe el archivo solicitado (DEMOCRIS)");
      }
      return redirectTo(data.signedUrl);
    }

    // DEMOPRINCE → un solo dispositivo (registra IP/UA la primera vez)
    if (token === "demoprince") {
      console.log("[SIGNED-URL] DEMOPRINCE pedido:", { file });
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const ua = req.headers["user-agent"] || "unknown";

      const { data: row, error: rowErr } = await sb.from("access_tokens").select("*").eq("token", token).single();

      if (rowErr) {
        console.error("[SIGNED-URL] DEMOPRINCE read token error:", rowErr);
        res.statusCode = 500;
        return res.end("Error interno");
      }

      if (row && row.first_ip && row.first_user_agent) {
        if (row.first_ip !== ip || row.first_user_agent !== ua) {
          console.warn("[SIGNED-URL] DEMOPRINCE token usado en otro dispositivo", { token, ip, ua, rowFirstIp: row.first_ip });
          res.statusCode = 403;
          return res.end("Token en otro dispositivo");
        }
      } else {
        // guardar primera IP/UA
        const { error: updErr } = await sb.from("access_tokens").update({
          first_ip: ip,
          first_user_agent: ua,
          used_at: new Date().toISOString()
        }).eq("token", token);

        if (updErr) {
          console.error("[SIGNED-URL] DEMOPRINCE update error:", updErr);
          // no detenemos el flujo por un update fallido, solo logueamos
        }
      }

      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
      if (error || !data || !data.signedUrl) {
        console.error("[SIGNED-URL] DEMOPRINCE ERR:", error, "file:", file);
        res.statusCode = 404;
        return res.end("No existe el archivo solicitado (DEMOPRINCE)");
      }
      return redirectTo(data.signedUrl);
    }

    // TOKENS NORMALES (pagados)
    const { data: tokenRow, error: tokenErr } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenErr || !tokenRow) {
      console.warn("[SIGNED-URL] token inválido", { token, tokenErr });
      res.statusCode = 403;
      return res.end("Token inválido");
    }

    // verificar expiración/estado
    const now = new Date();
    if (tokenRow.expires_at && now > new Date(tokenRow.expires_at)) {
      console.warn("[SIGNED-URL] token caducado", { token, expires_at: tokenRow.expires_at });
      res.statusCode = 403;
      return res.end("Token caducado");
    }
    if (tokenRow.status === "expired") {
      console.warn("[SIGNED-URL] token marcado expired", { token });
      res.statusCode = 403;
      return res.end("Token expirado");
    }

    // generar signed url
    const { data: signedData, error: urlError } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
    if (urlError || !signedData || !signedData.signedUrl) {
      console.error("[SIGNED-URL] NORMAL ERR:", urlError, "file:", file);
      res.statusCode = 404;
      return res.end("No existe el archivo solicitado");
    }

    return redirectTo(signedData.signedUrl);

  } catch (e) {
    console.error("[SIGNED-URL] ERROR general:", e);
    res.statusCode = 500;
    return res.end("Error interno del servidor");
  }
}

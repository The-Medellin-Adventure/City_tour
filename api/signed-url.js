+import { supabaseAdmin } from '../lib/_supabaseClient.js';
+
+export default async function handler(req, res) {
+  try {
+    const { file, token } = req.query;
+
+    if (!file || !token) {
+      console.error("[SIGNED-URL] Faltan parámetros", { file, token });
+      return res.status(400).send("Faltan parámetros");
+    }
+
+    const sb = supabaseAdmin();
+    let signedUrl = null;
+    let logContext = { file, token };
+
+    // DEMOCRIS → acceso libre
+    if (token === "democris") {
+      console.log("[SIGNED-URL] DEMOCRIS acceso libre", logContext);
+      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
+      if (error || !data || !data.signedUrl) {
+        console.error("[SIGNED-URL] DEMOCRIS ERROR no existe archivo o error Supabase", { error, file });
+        return res.status(404).send("No existe el archivo solicitado (DEMOCRIS)");
+      }
+      signedUrl = data.signedUrl;
+      return res.redirect(302, signedUrl);
+    }
+
+    // DEMOPRINCE → un solo dispositivo
+    if (token === "demoprince") {
+      console.log("[SIGNED-URL] DEMOPRINCE acceso único equipo", logContext);
+      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
+      const ua = req.headers["user-agent"] || "unknown";
+
+      const { data: row } = await sb.from("access_tokens").select("*").eq("token", token).single();
+      if (row && row.first_ip && row.first_user_agent) {
+        if (row.first_ip !== ip || row.first_user_agent !== ua) {
+          console.warn("[SIGNED-URL] TOKEN DEMOPRINCE en otro dispositivo", { ip, ua });
+          return res.status(403).send("Token en otro dispositivo");
+        }
+      } else {
+        await sb.from("access_tokens").update({
+          first_ip: ip,
+          first_user_agent: ua,
+          used_at: new Date().toISOString(),
+        }).eq("token", token);
+      }
+
+      const { data, error } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
+      if (error || !data || !data.signedUrl) {
+        console.error("[SIGNED-URL] DEMOPRINCE ERROR no existe archivo o error Supabase", { error, file });
+        return res.status(404).send("No existe el archivo solicitado (DEMOPRINCE)");
+      }
+      signedUrl = data.signedUrl;
+      return res.redirect(302, signedUrl);
+    }
+
+    // TOKENS NORMALES
+    const { data: tokenRow, error } = await sb
+      .from("access_tokens")
+      .select("*")
+      .eq("token", token)
+      .single();
+
+    if (error || !tokenRow) {
+      console.warn("[SIGNED-URL] TOKEN inválido", { token, error });
+      return res.status(403).send("Token inválido");
+    }
+
+    // Verificar expiración
+    const now = new Date();
+    if (tokenRow.expires_at && now > new Date(tokenRow.expires_at)) {
+      console.warn("[SIGNED-URL] TOKEN caducado", { token });
+      return res.status(403).send("Token caducado");
+    }
+    if (tokenRow.status === "expired") {
+      console.warn("[SIGNED-URL] TOKEN expirado", { token });
+      return res.status(403).send("Token expirado");
+    }
+
+    // Generar URL firmada
+    const { data, error: urlError } = await sb.storage.from("Tour").createSignedUrl(file, 3600);
+    if (urlError || !data || !data.signedUrl) {
+      console.error("[SIGNED-URL] NORMAL ERROR no existe archivo o error Supabase", { error: urlError, file });
+      return res.status(404).send("No existe el archivo solicitado");
+    }
+
+    signedUrl = data.signedUrl;
+    return res.redirect(302, signedUrl);
+
+  } catch (e) {
+    console.error("[SIGNED-URL] ERROR general", { error: e });
+    return res.status(500).send("Error interno del servidor");
+  }
+}

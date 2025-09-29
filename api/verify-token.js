```js
```js
// api/verify-token.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Falta token" });
    }

    const sb = supabaseAdmin();
    const { data: tokenRow, error } = await sb
      .from("access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !tokenRow) {
      return res.status(403).json({ ok: false, error: "Token inválido o no existe" });
    }

    // ✅ Token DEMOCRIS → válido siempre
    if (tokenRow.token === "democris") {
      return res.status(200).json({ ok: true, type: "democris" });
    }

    // ✅ Token DEMOPRINCE → válido siempre en el mismo equipo
    if (tokenRow.token === "demoprince") {
      return res.status(200).json({ ok: true, type: "demoprince" });
    }

    // ✅ Tokens normales
    if (tokenRow.status !== "active") {
      return res.status(403).json({ ok: false, error: "Token no está activo" });
    }

    if (tokenRow.expires_at) {
      const now = new Date();
      const exp = new Date(tokenRow.expires_at);
      if (now > exp) {
        return res.status(403).json({ ok: false, error: "Token caducado" });
      }
    }

    return res.status(200).json({ ok: true, type: "normal" });

  } catch (e) {
    console.error("❌ Error en verify-token:", e);
    return res.status(500).json({ ok: false, error: "Error interno en verify-token" });
  }
}
```

```


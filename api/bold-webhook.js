// api/bold-webhook.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";
import { nanoid } from "nanoid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const event = req.body;

    // ⚠️ Aquí valida que event.payment.status === "APPROVED" (según Bold)
    if (!event || event.payment?.status !== "APPROVED") {
      return res.status(400).json({ error: "Pago no aprobado" });
    }

    const email = event.customer?.email || "sin_email@demo.com";
    const token = nanoid();

    const sb = supabaseAdmin();

    // Insertar en Supabase con expiración de 1 hora
    await sb.from("access_tokens").insert({
      token,
      email,
      status: "active",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    console.log("✅ Token insertado:", token);

    return res.status(200).json({ ok: true, token });
  } catch (e) {
    console.error("❌ Error en bold-webhook:", e);
    return res.status(500).json({ error: e.message });
  }
}

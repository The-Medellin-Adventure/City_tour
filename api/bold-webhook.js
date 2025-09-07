// api/bold-webhook.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

/**
 * 🚀 Webhook de Bold
 * Procesa cualquier pago aprobado, genera un token en Supabase
 * y envía un correo con el enlace al cliente.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const event = req.body;

    // 🔎 Logs para depuración
    console.log("📩 Evento recibido de Bold (RAW):", event);
    console.log("📦 event.data:", JSON.stringify(event.data, null, 2));

    // ====================================
    // 1️⃣ Validar que sea una venta aprobada
    // ====================================
    if (event.type !== "SALE_APPROVED") {
      console.log("⚠️ Evento ignorado (no aprobado):", event.type);
      return res.status(200).json({ ok: true, ignored: true, type: event.type });
    }
    console.log("✅ Pago aprobado por Bold");

    // ====================================
    // 2️⃣ Obtener email del cliente
    // Bold puede enviar el correo en distintos lugares según método de pago
    // ====================================
    const email =
      event.customer?.email ||
      event.data?.customer_email ||
      event.data?.payer?.email ||
      event.data?.payer_email; // 👈 caso real visto en tus logs

    if (!email) {
      console.error("❌ No se encontró email en el evento:", event);
      return res.status(200).json({ ok: false, error: "No email" });
    }
    console.log("✅ Email del cliente:", email);

    // ====================================
    // 3️⃣ Crear token único en Supabase
    // ====================================
    const token = nanoid();
    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("access_tokens")
      .insert({
        token,
        email,
        status: "active",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // válido 7 días
      })
      .select();

    if (error) {
      console.error("❌ Error insertando token en Supabase:", error);
      return res.status(500).json({ error: "No se pudo crear token", detail: error });
    }
    console.log("✅ Token insertado en Supabase:", data);

    // ====================================
    // 4️⃣ Construir URL de acceso al tour
    // ====================================
    const tourUrl = `https://citytour360.vercel.app/?token=${token}`;

    // ====================================
    // 5️⃣ Configurar transporte SMTP
    // ====================================
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // usar true solo si el puerto es 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ====================================
    // 6️⃣ Enviar correo al cliente
    // ====================================
    await transporter.sendMail({
      from: `"CityTour360" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "🎉 Acceso a tu Tour Virtual",
      html: `
        <h2>¡Gracias por tu compra!</h2>
        <p>Puedes acceder a tu tour virtual en el siguiente enlace:</p>
        <p><a href="${tourUrl}" target="_blank">${tourUrl}</a></p>
        <p><b>Importante:</b> este enlace solo se puede abrir en un dispositivo y estará activo durante 7 días.</p>
        <br/>
        <p>Si tienes problemas con el acceso, responde a este correo.</p>
      `,
    });

    console.log("📧 Correo enviado a:", email);

    // ====================================
    // 7️⃣ Responder OK a Bold
    // ====================================
    return res.status(200).json({ ok: true, token, email });
  } catch (e) {
    console.error("❌ Error en bold-webhook:", e);
    return res.status(500).json({ error: e.message });
  }
}

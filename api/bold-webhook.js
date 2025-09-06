// api/bold-webhook.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const event = req.body;

    // 1. Validar que el pago en Bold fue aprobado
    if (!event || event.payment?.status !== "APPROVED") {
      return res.status(400).json({ error: "Pago no aprobado" });
    }

    const email = event.customer?.email;
    if (!email) {
      return res.status(400).json({ error: "No se recibió email del cliente" });
    }

    // 2. Crear token único con expiración de 1 hora
    const token = nanoid();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const sb = supabaseAdmin();

    await sb.from("access_tokens").insert({
      token,
      email,
      status: "active",
      expires_at: expiresAt,
    });

    console.log("✅ Token insertado en Supabase:", token);

    // 3. Construir URL del tour
    const tourUrl = `https://citytour360.vercel.app/?token=${token}`;

    // 4. Configurar transporte SMTP con Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // usar true solo si el puerto es 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 5. Enviar correo al cliente
    await transporter.sendMail({
      from: `"CityTour360" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "🎉 Acceso a tu Tour Virtual",
      html: `
        <h2>¡Gracias por tu compra!</h2>
        <p>Puedes acceder a tu tour virtual en el siguiente enlace:</p>
        <p><a href="${tourUrl}" target="_blank">${tourUrl}</a></p>
        <p><b>Importante:</b> este enlace solo se puede abrir en un dispositivo y estará activo durante 1 hora.</p>
        <br/>
        <p>Si tienes problemas con el acceso, puedes escribirnos a este correo o al WhatsApp +573247615677.</p>
      `,
    });

    console.log("📧 Correo enviado a:", email);

    return res.status(200).json({ ok: true, token, email });
  } catch (e) {
    console.error("❌ Error en bold-webhook:", e);
    return res.status(500).json({ error: e.message });
  }
}

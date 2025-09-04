import { supabaseAdmin } from "../lib/_supabaseClient.js";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const evento = req.body;
    if (evento?.status !== "APPROVED") {
      return res.status(200).json({ ok: true, msg: "Pago no aprobado" });
    }

    const email = evento.customer?.email;
    if (!email) {
      return res.status(400).json({ error: "No se recibió email del cliente" });
    }

    const ttlHours = 1;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("access_tokens")
      .insert([{
        token: crypto.randomUUID(),
        status: "active",
        email,
        expires_at: expiresAt
      }])
      .select("token")
      .single();

    if (error) {
      console.error("❌ Error insertando token:", error);
      return res.status(500).json({ error: "No se pudo crear token" });
    }

    const enlace = `https://citytour360.vercel.app/?token=${data.token}`;

    // ✉️ Enviar correo con Gmail (SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"CityTour360" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Acceso exclusivo a tu tour 360",
      html: `
        <h2>¡Gracias por tu compra!</h2>
        <p>Tu enlace único (válido 1 hora, un solo dispositivo):</p>
        <p><a href="${enlace}" target="_blank">${enlace}</a></p>
      `
    });

    console.log(`✅ Enlace enviado a ${email}: ${enlace}`);
    return res.status(200).json({ ok: true, enlace });

  } catch (e) {
    console.error("❌ Error en webhook Bold:", e);
    return res.status(500).json({ error: e.message });
  }
}

// api/bold-webhook.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

/**
 * 🚀 Punto de entrada del Webhook
 * Bold llamará este endpoint cuando ocurra un pago.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const event = req.body;
    console.log("📩 Evento recibido de Bold:", JSON.stringify(event, null, 2));

    // ====================================
    // 1️⃣ Validar que el pago fue aprobado
    // ====================================
const status = event.payment?.status || event.type;
if (status !== "APPROVED" && status !== "SALE_APPROVED") {
  console.log("⚠️ Pago rechazado o pendiente:", status);
  return res.status(400).json({ error: "Pago no aprobado", status });
}

    // ====================================
    // 2️⃣ Filtrar que el producto sea "Medellín Virtual 360"
    // (según cómo Bold envía los datos, puede estar en order.product.name o similar)
    // ====================================
    const productName = event.order?.product?.name || event.checkout?.name;
    if (productName !== "Medellín Virtual 360") {
      console.log("⚠️ Pago recibido pero no corresponde al tour:", productName);
      return res
        .status(200)
        .json({ ok: true, message: "Pago recibido pero no es del tour" });
    }

    // ====================================
    // 3️⃣ Obtener email del cliente
    // ====================================
    const email = event.customer?.email;
    if (!email) {
      return res.status(400).json({ error: "No se recibió email del cliente" });
    }

    // ====================================
// 4️⃣ Crear token único en Supabase
const token = nanoid();

const sb = supabaseAdmin();
const { data, error } = await sb.from("access_tokens").insert({
  token,
  email,
  status: "active",
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
}).select();

if (error) {
  console.error("❌ Error insertando token en Supabase:", error);
} else {
  console.log("✅ Token insertado en Supabase:", data);
}

    // ====================================
    // 5️⃣ Construir URL de acceso al tour
    // ====================================
    const tourUrl = `https://citytour360.vercel.app/?token=${token}`;

    // ====================================
    // 6️⃣ Configurar transporte SMTP
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
    // 7️⃣ Enviar correo al cliente
    // ====================================
    await transporter.sendMail({
      from: `"CityTour360" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "🎉 Acceso a tu Tour Virtual",
      html: `
        <h2>¡Gracias por tu compra!</h2>
        <p>Puedes acceder a tu tour virtual en el siguiente enlace:</p>
        <p><a href="${tourUrl}" target="_blank">${tourUrl}</a></p>
        <p><b>Importante:</b> este enlace solo se puede abrir en un dispositivo y estará activo durante 1 hora a partir del primer uso.</p>
        <br/>
        <p>Si tienes problemas con el acceso, responde a este correo.</p>
      `,
    });

    console.log("📧 Correo enviado a:", email);

    // ====================================
    // 8️⃣ Responder a Bold
    // ====================================
    return res.status(200).json({ ok: true, token, email });
  } catch (e) {
    console.error("❌ Error en bold-webhook:", e);
    return res.status(500).json({ error: e.message });
  }
}

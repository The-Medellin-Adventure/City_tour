// api/bold-webhook.js
import { supabaseAdmin } from "../lib/_supabaseClient.js";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

/**
 * 🚀 Webhook de Bold
 * Este endpoint recibe las notificaciones de pago de Bold
 * y, si el pago es aprobado, genera un token en Supabase
 * y envía un correo al cliente con el acceso al tour.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // ====================================
    // 0️⃣ Log del evento completo
    // ====================================
    console.log("📩 Evento recibido de Bold (RAW body):", req.body);
    const event = req.body;
    console.log("📩 Evento recibido de Bold (JSON):", JSON.stringify(event, null, 2));

    // ====================================
    // 1️⃣ Validar que el pago fue aprobado
    // Bold puede mandar el estado en distintos campos:
    // - event.payment.status → "APPROVED"
    // - event.type → "SALE_APPROVED" | "SALE_REJECTED"
    // - event.data.status (en algunas integraciones)
    // ====================================
    const status = event.payment?.status || event.type || event.data?.status;

    if (status !== "APPROVED" && status !== "SALE_APPROVED") {
      console.log("⚠️ Pago rechazado o pendiente. Estado recibido:", status);
      return res.status(400).json({ error: "Pago no aprobado", status });
    }
    console.log("✅ Pago aprobado con estado:", status);

    // ====================================
    // 2️⃣ Validar que el producto corresponda al tour
    // Según la integración puede estar en order.product.name o checkout.name
    // ====================================
    const productName = event.order?.product?.name || event.checkout?.name;
    if (productName !== "Medellín Virtual 360") {
      console.log("⚠️ Pago recibido pero no corresponde al tour:", productName);
      return res.status(200).json({ ok: true, message: "Pago recibido pero no es del tour" });
    }
    console.log("✅ Producto validado:", productName);

    // ====================================
    // 3️⃣ Obtener email del cliente
    // ====================================
    const email = event.customer?.email;
    if (!email) {
      console.error("❌ No se recibió email del cliente");
      return res.status(400).json({ error: "No se recibió email del cliente" });
    }
    console.log("✅ Email del cliente:", email);

    // ====================================
    // 4️⃣ Crear token único en Supabase
    // ====================================
    const token = nanoid();

    const sb = supabaseAdmin();
    const { data, error } = await sb.from("access_tokens").insert({
      token,
      email,
      status: "active",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // válido 7 días
    }).select();

    if (error) {
      console.error("❌ Error insertando token en Supabase:", error);
      return res.status(500).json({ error: "No se pudo crear token en Supabase", detail: error });
    }
    console.log("✅ Token insertado en Supabase:", data);

    // ====================================
    // 5️⃣ Construir URL de acceso al tour
    // 👉 Cambia el dominio si usas un custom domain
    // ====================================
    const tourUrl = `https://citytour360.vercel.app/?token=${token}`;

    // ====================================
    // 6️⃣ Configurar transporte SMTP (correo)
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
    // 8️⃣ Responder a Bold (debe ser 200 para que no reintente)
    // ====================================
    return res.status(200).json({ ok: true, token, email });
  } catch (e) {
    console.error("❌ Error en bold-webhook:", e);
    return res.status(500).json({ error: e.message });
  }
}

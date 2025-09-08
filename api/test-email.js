// api/test-email.js
import nodemailer from "nodemailer";

/**
 * 🚀 Endpoint de prueba para verificar configuración SMTP (Brevo)
 * Úsalo en tu navegador: https://citytour360.vercel.app/api/test-email
 */
export default async function handler(req, res) {
  try {
    // 1️⃣ Configuración de transporte SMTP con Brevo
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // API Key de Brevo
        pass: process.env.SMTP_PASS, // misma API Key
      },
    });

    // 2️⃣ Destinatario de prueba (puedes cambiarlo por tu correo personal)
    const testRecipient = process.env.TEST_EMAIL || "themedellinadventure@gmail.com";

    // 3️⃣ Enviar correo de prueba
    await transporter.sendMail({
      from: `"CityTour360" <${process.env.SENDER_EMAIL}>`,
      to: testRecipient,
      subject: "📩 Test de correo con Brevo",
      html: `
        <h2>Prueba exitosa 🚀</h2>
        <p>Este es un correo de prueba enviado desde Vercel usando Brevo.</p>
        <p>Si lo recibiste, tu configuración SMTP está funcionando correctamente ✅.</p>
      `,
    });

    console.log(`📧 Correo de prueba enviado a: ${testRecipient}`);

    return res.status(200).json({
      ok: true,
      message: `Correo de prueba enviado a ${testRecipient} ✅`,
    });
  } catch (e) {
    console.error("❌ Error enviando correo de prueba:", e);
    return res.status(500).json({ error: e.message });
  }
}

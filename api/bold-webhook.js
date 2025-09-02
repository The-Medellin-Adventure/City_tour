export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Verificar secreto
  const signature = req.headers["x-bold-signature"];
  const expectedSecret = process.env.BOLD_WEBHOOK_SECRET;

  if (!signature || signature !== expectedSecret) {
    return res.status(401).json({ error: "Firma inválida" });
  }

  try {
    const event = req.body;

    // Aquí manejas el evento de Bold
    if (event.type === "payment.success") {
      console.log("✅ Pago recibido:", event.data);
      // Guardar en Supabase, enviar email, desbloquear acceso, etc.
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error procesando webhook:", error);
    return res.status(400).json({ error: "Webhook inválido" });
  }
}

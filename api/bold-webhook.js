// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  try {
    const event = req.body;

    console.log("Evento recibido de Bold:", event);

    // Ejemplo: si Bold manda un estado de pago aprobado
    if (event.status === "APPROVED") {
      // Aquí pones lo que quieras que pase: activar acceso, guardar en BD, etc.
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error procesando webhook:", err);
    res.status(400).send("Webhook inválido");
  }
}

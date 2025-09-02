export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const event = req.body;

    // Verificar que Bold envía un estado aprobado
    if (event.status && event.status === "APPROVED") {
      // Generar un código único de acceso
      const accessCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Aquí puedes guardar el código en una base de datos o archivo
      // Por ahora solo lo devolvemos en la respuesta
      return res.status(200).json({
        message: "Pago recibido correctamente",
        tourAccess: `https://citytour360.vercel.app/tour?code=${accessCode}`
      });
    }

    // Si el pago aún no está aprobado
    return res.status(200).json({
      message: "Pago recibido pero aún no aprobado",
      status: event.status
    });
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.status(500).json({ message: "Error procesando webhook" });
  }
}

export default function handler(req, res) {
  try {
    console.log("✅ signed-url function ejecutándose");
    return res.status(200).json({
      ok: true,
      message: "La función funciona correctamente en Vercel"
    });
  } catch (e) {
    console.error("❌ Error en prueba:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}


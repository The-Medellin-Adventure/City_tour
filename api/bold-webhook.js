// api/webhook-bold.js
import { supabaseAdmin } from './_supabaseClient.js';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 22);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Método no permitido' });
    }

    // Bold envía los datos del pedido aquí (ajusta según payload real)
    const body = req.body || {};
    console.log('Webhook recibido de Bold:', body);

    const sb = supabaseAdmin();

    // 📌 Extraer email u otros datos según Bold
    const email = body?.customer?.email || null;

    // Crear token único con caducidad (ejemplo: 24h)
    const ttlHours = Number(process.env.ACCESS_TOKEN_TTL_HOURS || '24');
    const exp = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    const token = nanoid();

    // Guardar en Supabase
    if (email) {
      await sb.from('access_tokens').insert({
        email,
        token,
        exp
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error en webhook Bold:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

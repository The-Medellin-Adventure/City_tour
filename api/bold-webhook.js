// api/bold-webhook.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';
import { customAlphabet } from 'nanoid';
import sgMail from '@sendgrid/mail';

const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 22);
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido' });

  try {
    const body = req.body || {};
    console.log('Webhook recibido de Bold:', JSON.stringify(body).slice(0,1000));

    // Detectar estado y email en payloads distintos (por si Bold usa distinto nombre)
    const status = (body.status || body.event_type || body.type || '').toString().toUpperCase();
    const email = body?.customer?.email || body?.buyer_email || body?.email || body?.customer?.email_address || null;

    // Consideramos aprobado si status contiene APPROV o PAID o SUCCESS (por seguridad)
    const approved = /APPROV|PAID|SUCCESS/.test(status);

    if (!approved) {
      // Solo registramos/acknowledge eventos que no sean aprobados
      return res.status(200).json({ ok: true, message: 'Evento recibido (no aprobado)', status });
    }

    // Generar token y fecha de expiración
    const ttlHours = Number(process.env.ACCESS_TOKEN_TTL_HOURS || '24');
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
    const token = nanoid();

    const sb = supabaseAdmin();

    // Guardar en la tabla access_tokens (ajusta nombres si los cambiaste)
    const insertPayload = {
      token,
      status: 'active',
      email,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    const { error: insertError } = await sb.from('access_tokens').insert([insertPayload]);

    if (insertError) {
      console.error('Error guardando token en Supabase:', insertError);
      // seguimos para no bloquear a Bold, pero retornamos error para logs
      return res.status(500).json({ ok: false, error: 'No se pudo guardar token' });
    }

    const appBase = (process.env.APP_BASE_URL || 'https://citytour360.vercel.app').replace(/\/$/, '');
    const accessLink = `${appBase}/?token=${token}`;

    // Enviar email si tenemos configuración de SendGrid y email del comprador
    if (email && process.env.SENDGRID_API_KEY && process.env.SENDER_EMAIL) {
      const ttlText = `${ttlHours} hora${ttlHours>1?'s':''}`;
      const msg = {
        to: email,
        from: process.env.SENDER_EMAIL,
        subject: 'Acceso exclusivo a tu tour 360 — The Medellin Adventure',
        text: `Gracias por tu compra. Accede al tour aquí (un uso, expira en ${ttlText}): ${accessLink}`,
        html: `<p>Gracias por tu compra.</p><p>Tu acceso único al tour (expira en ${ttlText}): <a href="${accessLink}">${accessLink}</a></p>`
      };
      try {
        await sgMail.send(msg);
        console.log('Email enviado a', email);
      } catch (e) {
        console.error('Error enviando email:', e);
        // no devolvemos error al webhook para que Bold no piense que falló la entrega
      }
    }

    // Respuesta (útil para pruebas)
    return res.status(200).json({ ok: true, token, accessLink, expires_at: expiresAt });
  } catch (err) {
    console.error('Error en webhook-bold:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}


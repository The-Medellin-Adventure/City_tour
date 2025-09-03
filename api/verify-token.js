// api/verify-token.js
import { supabaseAdmin } from '../lib/_supabaseClient.js';


export default async function handler(req, res) {
try {
const token = req.query.token?.toString();
if (!token) return res.status(400).json({ ok: false, error: 'Falta token' });


const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
const ua = (req.headers['user-agent'] || '').toString();


const sb = supabaseAdmin();
const { data: rows, error } = await sb
.from('access_tokens')
.select('*')
.eq('token', token)
.limit(1);


if (error) throw error;
const row = rows?.[0];
if (!row) return res.status(403).json({ ok: false, error: 'Token inválido' });


const now = new Date();
const exp = new Date(row.expires_at);
if (now > exp || row.status === 'expired') {
// Expira si ya pasó el tiempo
await sb.from('access_tokens').update({ status: 'expired' }).eq('id', row.id);
return res.status(403).json({ ok: false, error: 'Token caducado' });
}


// Si ya fue usado, permitimos solo al mismo IP/UA dentro del plazo
if (row.used_at) {
if (row.first_ip !== ip || row.first_user_agent !== ua) {
return res.status(403).json({ ok: false, error: 'Token ya usado' });
}
return res.json({ ok: true });
}


// Primer uso: marcamos como usado y registramos IP/UA
await sb
.from('access_tokens')
.update({ used_at: new Date().toISOString(), first_ip: ip, first_user_agent: ua, status: 'used' })
.eq('id', row.id);


return res.json({ ok: true });
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}
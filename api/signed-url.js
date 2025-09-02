// api/signed-url.js
import { supabaseAdmin } from './_supabaseClient.js';


export default async function handler(req, res) {
try {
const token = req.query.token?.toString();
const file = req.query.file?.toString(); // ej: 'scenes/0-plaza.jpg'
if (!token || !file) return res.status(400).json({ ok: false, error: 'Faltan token o file' });


// Reutilizamos la verificación de token (simple): llamamos internamente a Supabase
const sb = supabaseAdmin();
const { data: rows, error } = await sb
.from('access_tokens')
.select('*')
.eq('token', token)
.limit(1);
if (error) throw error;
const row = rows?.[0];
if (!row || row.status === 'expired') return res.status(403).json({ ok: false, error: 'Token inválido' });


const now = new Date();
const exp = new Date(row.expires_at);
if (now > exp) return res.status(403).json({ ok: false, error: 'Token caducado' });


// Si ya fue usado, permitimos solo al mismo IP/UA
const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
const ua = (req.headers['user-agent'] || '').toString();
if (row.used_at && (row.first_ip !== ip || row.first_user_agent !== ua)) {
return res.status(403).json({ ok: false, error: 'Token ya usado' });
}


const bucket = process.env.SUPABASE_BUCKET || 'tour';
const expiresIn = 60 * 15; // 15 minutos por URL firmada


const { data, error: sErr } = await sb
.storage
.from(bucket)
.createSignedUrl(file, expiresIn);


if (sErr) throw sErr;
return res.json({ ok: true, url: data.signedUrl });
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}
import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { token } = JSON.parse(event.body || '{}');
    if (!token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing token' }) };

    const { data: tok, error: tErr } = await sb
      .from('verification_tokens')
      .select('id, user_id, type, token, expires_at, consumed')
      .eq('token', token)
      .eq('type', 'email')
      .single();
    if (tErr || !tok) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    if (tok.consumed || new Date(tok.expires_at) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token expired' }) };
    }

    const { error: upErr } = await sb.from('users').update({ verification_status: 'email_verified' }).eq('id', tok.user_id);
    if (upErr) return { statusCode: 500, headers, body: JSON.stringify({ error: upErr.message }) };

    await sb.from('verification_tokens').update({ consumed: true }).eq('id', tok.id);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}



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

  // Temporarily disabled
  return { statusCode: 501, headers, body: JSON.stringify({ error: 'Phone verification is currently disabled' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { phone, otp } = JSON.parse(event.body || '{}');
    if (!phone || !otp) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing phone or otp' }) };

    const { data: tok, error: tErr } = await sb
      .from('verification_tokens')
      .select('id, user_id, type, token, phone as token_phone, expires_at, consumed')
      .eq('token', otp)
      .eq('type', 'phone')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (tErr || !tok) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid OTP' }) };
    if (tok.consumed || new Date(tok.expires_at) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'OTP expired' }) };
    }

    const { error: upErr } = await sb.from('users').update({ verification_status: 'phone_verified', phone }).eq('id', tok.user_id);
    if (upErr) return { statusCode: 500, headers, body: JSON.stringify({ error: upErr.message }) };

    await sb.from('verification_tokens').update({ consumed: true }).eq('id', tok.id);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}



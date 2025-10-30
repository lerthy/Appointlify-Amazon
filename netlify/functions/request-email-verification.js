import { createClient } from '@supabase/supabase-js';

function makeToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    const { user_id, email } = JSON.parse(event.body || '{}');
    if (!user_id || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing user_id or email' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const token = makeToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb.from('verification_tokens').insert([
      { user_id, type: 'email', token, expires_at: expiresAt }
    ]);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

    const verifyUrl = `${process.env.FRONTEND_URL || ''}/verify-email?token=${token}`;

    // Send email via existing function
    await fetch(`${process.env.FRONTEND_URL || ''}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Verify your business email',
        text: `Click to verify your email: ${verifyUrl}`,
        html: `<p>Click to verify your email: <a href="${verifyUrl}">Verify Email</a></p>`
      })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}



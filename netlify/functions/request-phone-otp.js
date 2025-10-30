import { createClient } from '@supabase/supabase-js';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  // Temporarily disabled
  return { statusCode: 501, headers, body: JSON.stringify({ error: 'Phone verification is currently disabled' }) };

  try {
    const { user_id, phone } = JSON.parse(event.body || '{}');
    if (!user_id || !phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing user_id or phone' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await sb.from('verification_tokens').insert([
      { user_id, type: 'phone', token: otp, phone, expires_at: expiresAt }
    ]);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

    // Send SMS via existing function
    const smsRes = await fetch(`${process.env.FRONTEND_URL || ''}/.netlify/functions/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message: `Your Appointly verification code is ${otp}. It expires in 10 minutes.` })
    });
    if (!smsRes.ok) {
      // Not critical for DB token creation
      console.log('Failed to send SMS:', await smsRes.text());
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}



const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { token, password } = JSON.parse(event.body || '{}');
    if (!token || !password) return { statusCode: 400, body: 'Bad Request' };
    if (!supabase) return { statusCode: 400, body: 'Invalid or expired token' };

    const nowIso = new Date().toISOString();
    const { data: t, error } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, used')
      .eq('token', token)
      .single();
    if (error || !t || t.used || t.expires_at <= nowIso) {
      return { statusCode: 400, body: 'Invalid or expired token' };
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const { error: updErr } = await supabase.from('users').update({ password_hash: hash }).eq('id', t.user_id);
    if (updErr) return { statusCode: 500, body: 'Server Error' };

    await supabase.from('password_reset_tokens').update({ used: true }).eq('token', token);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 400, body: 'Invalid or expired token' };
  }
};




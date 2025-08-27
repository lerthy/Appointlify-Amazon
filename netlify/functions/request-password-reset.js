const { createClient } = require('@supabase/supabase-js');

// Required env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY; // kept for backward compatibility (browser usage)
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY; // preferred for server-to-server requests
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const generic = { statusCode: 200, body: JSON.stringify({ ok: true }) };
  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email || typeof email !== 'string') return generic;

    if (!supabase) return generic;

    const normalized = String(email).trim().toLowerCase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalized)
      .single();
    if (error || !user) return generic;

    // Create one-time token valid for 1 hour
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase.from('password_reset_tokens').update({ used: true }).eq('user_id', user.id).eq('used', false);
    await supabase.from('password_reset_tokens').insert({ token, user_id: user.id, expires_at: expiresAt, used: false });

    const origin = SITE_URL || (event.headers.origin || '').replace(/\/$/, '') || `https://${event.headers.host}`;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    // Send via EmailJS
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && (EMAILJS_PRIVATE_KEY || EMAILJS_PUBLIC_KEY)) {
      // Prefer server-to-server with PRIVATE KEY (Authorization header). Falls back to PUBLIC KEY payload if provided.
      const emailJsBody = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        // user_id is required when using public key from browsers; ignored when Authorization header is used
        ...(EMAILJS_PRIVATE_KEY ? {} : { user_id: EMAILJS_PUBLIC_KEY }),
        template_params: { reset_url: resetUrl, email, to_email: email },
      };
      const headers = { 'Content-Type': 'application/json' };
      if (EMAILJS_PRIVATE_KEY) {
        headers.Authorization = `Bearer ${EMAILJS_PRIVATE_KEY}`;
      }
      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(emailJsBody),
      });
      const text = await resp.text();
      console.log('EmailJS status:', resp.status, 'body:', text);
    } else {
      console.log('Reset link (no EmailJS configured):', resetUrl);
    }

    return generic;
  } catch (e) {
    console.warn('request-password-reset error:', e?.message);
    return generic;
  }
};



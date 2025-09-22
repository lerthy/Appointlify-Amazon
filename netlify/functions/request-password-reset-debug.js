const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Required env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

exports.handler = async (event) => {
  console.log('🔍 DEBUG: Function started');
  console.log('🔍 Method:', event.httpMethod);
  console.log('🔍 Env check - SUPABASE_URL:', !!SUPABASE_URL);
  console.log('🔍 Env check - EMAILJS_SERVICE_ID:', !!EMAILJS_SERVICE_ID);
  console.log('🔍 Supabase client:', !!supabase);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const genericResponse = { 
    statusCode: 200, 
    headers,
    body: JSON.stringify({ 
      ok: true, 
      message: 'If an account exists for that email, a reset link has been sent.' 
    })
  };

  try {
    console.log('🔍 Parsing request body...');
    const { email } = JSON.parse(event.body || '{}');
    
    if (!email || typeof email !== 'string') {
      console.log('🔍 Invalid email input');
      return genericResponse;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log('🔍 Normalized email:', normalizedEmail);
    
    if (!validateEmail(normalizedEmail)) {
      console.log('🔍 Email validation failed');
      return genericResponse;
    }

    if (!supabase) {
      console.error('🔍 ERROR: Supabase client not configured');
      return genericResponse;
    }

    console.log('🔍 Checking if user exists...');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', normalizedEmail)
      .single();
    
    if (error) {
      console.log('🔍 User lookup error:', error.message);
      return genericResponse;
    }
    
    if (!user) {
      console.log('🔍 User not found for email:', normalizedEmail);
      return genericResponse;
    }

    console.log('🔍 User found, generating token...');
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    console.log('🔍 Cleaning up old tokens...');
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    console.log('🔍 Inserting new token...');
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({ 
        token, 
        user_id: user.id, 
        expires_at: expiresAt, 
        used: false 
      });

    if (tokenError) {
      console.error('🔍 ERROR: Token creation failed:', tokenError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }

    console.log('🔍 Token created successfully');
    return genericResponse;

  } catch (error) {
    console.error('🔍 FATAL ERROR:', error.message);
    console.error('🔍 Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

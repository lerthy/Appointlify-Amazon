const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Required env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    console.log('Function started');
    
    const { email } = JSON.parse(event.body || '{}');
    
    if (!email || typeof email !== 'string') {
      console.log('Invalid email');
      return genericResponse;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    if (!validateEmail(normalizedEmail)) {
      console.log('Email validation failed');
      return genericResponse;
    }

    if (!supabase) {
      console.error('Supabase client not configured');
      return genericResponse;
    }

    console.log('Looking up user...');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', normalizedEmail)
      .single();
    
    if (error || !user) {
      console.log('User not found');
      return genericResponse;
    }

    console.log('User found, creating token...');
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Clean up old tokens
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Create new token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({ 
        token, 
        user_id: user.id, 
        expires_at: expiresAt, 
        used: false 
      });

    if (tokenError) {
      console.error('Token creation failed:', tokenError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }

    console.log('Token created successfully');
    
    // For now, just log the reset URL instead of sending email
    const origin = process.env.SITE_URL || (event.headers.origin || '').replace(/\/$/, '') || `https://${event.headers.host}`;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    console.log('Reset URL would be:', resetUrl);

    return genericResponse;

  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

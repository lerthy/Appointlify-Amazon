// Ultra-robust version with extensive error handling


let createClient, crypto, fetch;

try {
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;

} catch (error) {
  console.error('❌ Failed to load Supabase:', error.message);
}

try {
  crypto = require('crypto');

} catch (error) {
  console.error('❌ Failed to load crypto:', error.message);
}

try {
  fetch = require('node-fetch');

} catch (error) {
  console.error('❌ Failed to load node-fetch:', error.message);
}

// Environment variables

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;




let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && createClient) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error.message);
  }
}

function generateSecureToken() {
  try {
    if (!crypto) throw new Error('Crypto module not available');
    return crypto.randomBytes(32).toString('hex');
  } catch (error) {
    console.error('Token generation failed:', error.message);
    throw error;
  }
}

function validateEmail(email) {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  } catch (error) {
    console.error('Email validation failed:', error.message);
    return false;
  }
}

exports.handler = async (event) => {
  
  
  );

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: '' };
  }

  // Method check
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


    // Parse body
    let requestData;
    try {

      requestData = JSON.parse(event.body || '{}');

    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    const { email } = requestData;

    // Input validation
    if (!email || typeof email !== 'string') {

      return genericResponse;
    }

    const normalizedEmail = String(email).trim().toLowerCase();


    if (!validateEmail(normalizedEmail)) {

      return genericResponse;
    }

    // Check dependencies
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection failed' })
      };
    }

    if (!crypto) {
      console.error('❌ Crypto module not available');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Crypto module failed' })
      };
    }

    // Database operations

    let user;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .ilike('email', normalizedEmail)
        .single();

      if (error) {

        return genericResponse;
      }

      user = data;
      if (!user) {

        return genericResponse;
      }


    } catch (dbError) {
      console.error('❌ Database lookup failed:', dbError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database lookup failed' })
      };
    }

    // Generate token

    let token;
    try {
      token = generateSecureToken();

    } catch (tokenError) {
      console.error('❌ Token generation failed:', tokenError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token generation failed' })
      };
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Clean up old tokens

    try {
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false);

    } catch (cleanupError) {
      console.error('⚠️ Token cleanup failed:', cleanupError.message);
      // Continue anyway
    }

    // Create new token

    try {
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          token,
          user_id: user.id,
          expires_at: expiresAt,
          used: false
        });

      if (tokenError) {
        console.error('❌ Token insertion failed:', tokenError.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Token creation failed' })
        };
      }


    } catch (insertError) {
      console.error('❌ Token insertion error:', insertError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token insertion failed' })
      };
    }


    return genericResponse;

  } catch (error) {
    console.error('💥 FATAL ERROR in handler:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

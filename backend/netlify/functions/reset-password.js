import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }
  
  return { valid: true };
}

async function hashPassword(password) {
  const saltRounds = 12; // Increased from 10 for better security
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

export const handler = async (event) => {
  // Set security headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
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

  try {
    const { token, password } = JSON.parse(event.body || '{}');
    
    // Input validation
    if (!token || typeof token !== 'string') {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Invalid or missing token' })
      };
    }
    
    if (!password || typeof password !== 'string') {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Password is required' })
      };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: passwordValidation.error })
      };
    }

    if (!supabase) {
      console.error('Supabase client not configured');
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Validate token
    const nowIso = new Date().toISOString();
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, used, created_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.log('Invalid token attempted:', token.substring(0, 8) + '...');
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    // Check if token is already used
    if (tokenData.used) {
      console.log('Used token attempted:', token.substring(0, 8) + '...');
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'This reset link has already been used' })
      };
    }

    // Check if token is expired
    if (tokenData.expires_at <= nowIso) {
      console.log('Expired token attempted:', token.substring(0, 8) + '...');
      
      // Mark expired token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);
      
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'This reset link has expired. Please request a new one.' })
      };
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      console.error('User not found for token:', tokenData.user_id);
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', tokenData.user_id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: 'Failed to update password' })
      };
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
      // This is not critical, continue
    }

    // Optionally invalidate other unused tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', tokenData.user_id)
      .eq('used', false)
      .neq('token', token);

    console.log(`Password successfully reset for user: ${user.email}`);

    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ 
        ok: true, 
        message: 'Password has been reset successfully' 
      })
    };

  } catch (error) {
    console.error('Password reset error:', error.message);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
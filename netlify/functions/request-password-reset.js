const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Polyfill fetch for Node.js environment if not available
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Required env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_EMAIL = 3; // Max 3 requests per email per window
const MAX_REQUESTS_PER_IP = 10; // Max 10 requests per IP per window

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// In-memory rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map();

function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimit(identifier, maxRequests) {
  cleanupRateLimit();
  const now = Date.now();
  const data = rateLimitStore.get(identifier);
  
  if (!data) {
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return true;
  }
  
  if (now - data.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return true;
  }
  
  if (data.count >= maxRequests) {
    return false;
  }
  
  data.count++;
  return true;
}

function generateSecureToken() {
  // Generate a cryptographically secure 32-byte token
  return crypto.randomBytes(32).toString('hex');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

exports.handler = async (event) => {
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

  // Generic success response for security (timing attack prevention)
  const genericResponse = { 
    statusCode: 200, 
    headers,
    body: JSON.stringify({ 
      ok: true, 
      message: 'If an account exists for that email, a reset link has been sent.' 
    })
  };

  try {
    const { email } = JSON.parse(event.body || '{}');
    
    // Input validation
    if (!email || typeof email !== 'string') {
      return genericResponse;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    if (!validateEmail(normalizedEmail)) {
      return genericResponse;
    }

    if (!supabase) {
      console.error('Supabase client not configured');
      return genericResponse;
    }

    // Rate limiting
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    
    if (!checkRateLimit(`email:${normalizedEmail}`, MAX_REQUESTS_PER_EMAIL)) {
      console.warn(`Rate limit exceeded for email: ${normalizedEmail}`);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Too many password reset requests. Please wait before trying again.' 
        })
      };
    }
    
    if (!checkRateLimit(`ip:${clientIP}`, MAX_REQUESTS_PER_IP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Too many requests from this IP. Please wait before trying again.' 
        })
      };
    }

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', normalizedEmail)
      .single();
    
    if (error || !user) {
      // Always return success for security (prevent email enumeration)
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return genericResponse;
    }

    // Clean up any existing unused tokens for this user
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Generate secure token and expiration (1 hour)
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store the token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({ 
        token, 
        user_id: user.id, 
        expires_at: expiresAt, 
        used: false 
      });

    if (tokenError) {
      console.error('Error creating password reset token:', tokenError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }

    // Generate reset URL
    const origin = SITE_URL || (event.headers.origin || '').replace(/\/$/, '') || `https://${event.headers.host}`;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    // Send email via EmailJS
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && (EMAILJS_PRIVATE_KEY || EMAILJS_PUBLIC_KEY)) {
      try {
        const emailJsBody = {
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          ...(EMAILJS_PRIVATE_KEY ? {} : { user_id: EMAILJS_PUBLIC_KEY }),
          template_params: { 
            reset_url: resetUrl, 
            email: normalizedEmail, 
            to_email: normalizedEmail,
            user_name: user.name || 'User',
            expires_in: '1 hour'
          },
        };

        const emailHeaders = { 'Content-Type': 'application/json' };
        if (EMAILJS_PRIVATE_KEY) {
          emailHeaders.Authorization = `Bearer ${EMAILJS_PRIVATE_KEY}`;
        }

        const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: emailHeaders,
          body: JSON.stringify(emailJsBody),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('EmailJS error:', emailResponse.status, errorText);
          throw new Error(`EmailJS failed: ${emailResponse.status}`);
        }

        console.log(`Password reset email sent successfully to: ${normalizedEmail}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        
        // Mark token as used since email failed
        await supabase
          .from('password_reset_tokens')
          .update({ used: true })
          .eq('token', token);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to send reset email. Please try again.' })
        };
      }
    } else {
      console.log('EmailJS not configured, reset link:', resetUrl);
      console.warn('Password reset email could not be sent - EmailJS not configured');
    }

    return genericResponse;
  } catch (error) {
    console.error('Password reset request error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
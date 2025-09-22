const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Required env
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Appointly';

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

  try {
    console.log('🔧 ENVIRONMENT CHECK:');
    console.log('SMTP_HOST:', !!SMTP_HOST ? SMTP_HOST : 'NOT SET');
    console.log('SMTP_PORT:', SMTP_PORT);
    console.log('SMTP_USER:', !!SMTP_USER ? SMTP_USER : 'NOT SET');
    console.log('SMTP_PASS:', !!SMTP_PASS ? 'SET' : 'NOT SET');
    console.log('FROM_EMAIL:', FROM_EMAIL);
    console.log('FROM_NAME:', FROM_NAME);

    const { email } = JSON.parse(event.body || '{}');
    
    if (!email || typeof email !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    if (!validateEmail(normalizedEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    if (!supabase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    // Look up user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', normalizedEmail)
      .single();
    
    if (error || !user) {
      console.log('User not found for:', normalizedEmail);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          message: 'If an account exists for that email, a reset link has been sent.',
          debug: 'User not found'
        })
      };
    }

    console.log('✅ User found:', user.email);

    // Generate token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store token
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
        body: JSON.stringify({ error: 'Token creation failed' })
      };
    }

    console.log('✅ Token created');

    // Generate reset URL
    const origin = process.env.SITE_URL || (event.headers.origin || '').replace(/\/$/, '') || `https://${event.headers.host}`;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    console.log('🔗 Reset URL:', resetUrl);

    // Check SMTP configuration
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('❌ SMTP not configured!');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          message: 'Token created but email not sent - SMTP not configured',
          debug: {
            smtp_host: !!SMTP_HOST,
            smtp_user: !!SMTP_USER,
            smtp_pass: !!SMTP_PASS,
            reset_url: resetUrl
          }
        })
      };
    }

    // Test email sending
    try {
      console.log('📧 Setting up SMTP transporter...');
      
      const transporter = nodemailer.createTransporter({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: parseInt(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      // Verify SMTP connection
      console.log('🔍 Testing SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified');

      const mailOptions = {
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: normalizedEmail,
        subject: `🔐 Password Reset Request - ${FROM_NAME}`,
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your password by clicking: <a href="${resetUrl}">Reset Password</a></p>`,
      };

      console.log('📤 Sending email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          message: 'Password reset email sent successfully!',
          debug: {
            messageId: info.messageId,
            to: normalizedEmail
          }
        })
      };

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Email sending failed',
          debug: emailError.message
        })
      };
    }

  } catch (error) {
    console.error('Function error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

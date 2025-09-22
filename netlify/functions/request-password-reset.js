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

    // Generate reset URL - FORCE production URL
    console.log('🔍 DEBUG - Headers:', JSON.stringify(event.headers, null, 2));
    console.log('🔍 DEBUG - SITE_URL:', SITE_URL);
    
    // FORCE the production URL - no more localhost!
    const origin = SITE_URL || 'https://appointly-ks.netlify.app';
    
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    console.log('🔗 FORCED reset URL:', resetUrl);

    // Send email via Nodemailer
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        console.log('📧 Setting up Nodemailer transporter...');
        console.log('SMTP Config:', { host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER });
        
        // Create reusable transporter object using SMTP transport
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT),
          secure: parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          // Additional options for better compatibility
          tls: {
            rejectUnauthorized: false
          }
        });

        console.log('🔍 Verifying SMTP connection...');
        
        // Verify connection configuration
        try {
          await transporter.verify();
          console.log('✅ SMTP Server is ready to take our messages');
        } catch (verifyError) {
          console.error('❌ SMTP verification failed:', verifyError.message);
          throw verifyError;
        }

        // Beautiful email template
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset Request</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .link-backup { word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello <strong>${user.name || 'User'}</strong>,</p>
                    
                    <p>We received a request to reset your password for your account associated with <strong>${normalizedEmail}</strong>.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p class="link-backup"><a href="${resetUrl}">${resetUrl}</a></p>
                    
                    <p><strong>⏰ This link will expire in 1 hour.</strong></p>
                    
                    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                    
                    <div class="footer">
                        <p>Best regards,<br>
                        <strong>${FROM_NAME} Team</strong></p>
                        <p style="margin-top: 20px; font-size: 12px; color: #999;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const emailText = `Password Reset Request

Hello ${user.name || 'User'},

We received a request to reset your password for your account associated with ${normalizedEmail}.

Reset your password by clicking this link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
${FROM_NAME} Team`;

        // Email options
        const mailOptions = {
          from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to: normalizedEmail,
          subject: `🔐 Password Reset Request - ${FROM_NAME}`,
          text: emailText,
          html: emailHtml,
        };

        console.log('📤 Sending email to:', normalizedEmail);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully! Message ID:', info.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError.message);
        console.error('Full error:', emailError);
        
        // Don't mark token as used on email failure - let user retry
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to send reset email. Please check your email configuration and try again.',
            details: emailError.message 
          })
        };
      }
    } else {
      console.log('📧 SMTP not configured, reset link would be:', resetUrl);
      console.warn('Missing SMTP configuration. Need: SMTP_HOST, SMTP_USER, SMTP_PASS');
      console.log('Current config:', {
        SMTP_HOST: !!SMTP_HOST,
        SMTP_USER: !!SMTP_USER, 
        SMTP_PASS: !!SMTP_PASS
      });
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
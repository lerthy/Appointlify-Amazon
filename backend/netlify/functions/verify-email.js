/**
 * Email Verification Endpoint
 * Verifies business email addresses using tokens sent via email
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Database not configured'
      })
    };
  }

  try {
    // Handle GET request (verify email with token)
    if (event.httpMethod === 'GET') {
      const token = event.queryStringParameters?.token;

      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Verification token is required'
          })
        };
      }

      // Find user with this token
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, email, email_verified, email_verification_token_expires')
        .eq('email_verification_token', token)
        .single();

      if (findError || !user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid or expired verification token'
          })
        };
      }

      // Check if already verified
      if (user.email_verified) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Email already verified',
            alreadyVerified: true
          })
        };
      }

      // Check if token is expired
      if (new Date(user.email_verification_token_expires) < new Date()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Verification token has expired. Please request a new one.',
            expired: true
          })
        };
      }

      // Verify the email
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          email_verification_token: null,
          email_verification_token_expires: null
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user verification status:', updateError);
        throw updateError;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Email verified successfully! You can now log in.',
          email: user.email
        })
      };
    }

    // Handle POST request (resend verification email)
    if (event.httpMethod === 'POST') {
      const { email } = JSON.parse(event.body || '{}');

      if (!email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Email is required'
          })
        };
      }

      // Find user by email
      const { data: user, error: findError } = await supabase
        .from('users')
        .select('id, email, email_verified')
        .eq('email', email)
        .single();

      if (findError || !user) {
        // Don't reveal if user exists or not for security
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'If an account with that email exists, a verification email has been sent.'
          })
        };
      }

      // Check if already verified
      if (user.email_verified) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Email is already verified'
          })
        };
      }

      // Generate new token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24); // 24 hour expiry

      // Update user with new token
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verification_token: token,
          email_verification_token_expires: expiry.toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating verification token:', updateError);
        throw updateError;
      }

      // Determine frontend URL dynamically based on origin or referer
      const origin = event.headers.origin || event.headers.referer || '';
      let frontendUrl = 'http://localhost:5000'; // Default for local development
      
      // Check which deployed frontend is making the request
      if (origin.includes('appointly-ks.netlify.app')) {
        frontendUrl = 'https://appointly-ks.netlify.app';
      } else if (origin.includes('appointly-qa.netlify.app')) {
        frontendUrl = 'https://appointly-qa.netlify.app';
      } else if (process.env.FRONTEND_URL && !origin) {
        // If no origin header, use first URL from env (backwards compatibility)
        frontendUrl = process.env.FRONTEND_URL.split(',')[0].trim();
      }
      
      // Send verification email (this will be handled by the email service)
      const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
      
      // Call email sending function
      try {
        const emailResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8888'}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: 'Verify Your Email - Appointly',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #4F46E5; text-align: center;">Verify Your Email</h1>
                <p>Thank you for registering with Appointly!</p>
                <p>Please click the button below to verify your email address and activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationLink}" 
                     style="background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Verify Email
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${verificationLink}" style="color: #4F46E5;">${verificationLink}</a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  This link will expire in 24 hours. If you didn't create an account with Appointly, please ignore this email.
                </p>
              </div>
            `,
            text: `
              Verify Your Email - Appointly
              
              Thank you for registering with Appointly!
              
              Please click the link below to verify your email address and activate your account:
              ${verificationLink}
              
              This link will expire in 24 hours. If you didn't create an account with Appointly, please ignore this email.
            `
          })
        });

        if (!emailResponse.ok) {
          console.error('Failed to send verification email');
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail the request if email sending fails
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Verification email sent successfully. Please check your inbox.'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };

  } catch (error) {
    console.error('Error in verify-email handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}


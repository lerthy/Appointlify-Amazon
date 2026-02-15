// Netlify function that sends appointment confirmation emails using Nodemailer
// This replaces EmailJS with a reliable server-side email solution

import nodemailer from 'nodemailer';

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { 
      to_name, 
      to_email, 
      appointment_date, 
      appointment_time, 
      business_name, 
      cancel_link,
      confirmation_link,
      service_name,
      business_logo_url 
    } = JSON.parse(event.body);
    
    // Validate required fields (same as frontend)
    if (!to_name || !to_email || !appointment_date || !appointment_time || !business_name || !cancel_link) {
      console.error('Missing required fields:', { 
        to_name, 
        to_email, 
        appointment_date, 
        appointment_time, 
        business_name,
        cancel_link 
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to_name, to_email, appointment_date, appointment_time, business_name, cancel_link' 
        })
      };
    }

    // Prepare email data
    const templateParams = {
      to_name: to_name,
      email: to_email,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      service_name: service_name || '',
      business_name: business_name,
      cancel_link: cancel_link,
      confirmation_link: confirmation_link || null,
      business_logo_url: business_logo_url || null,
    };

    console.log('[send-appointment-confirmation] Sending:', {
      to: to_email,
      business_name,
      appointment_date: appointment_date
    });

    // Configure Nodemailer with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'lerdi890@gmail.com', // Your Gmail
        pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password (not regular password)
      }
    });

    // Email content
    const mailOptions = {
      from: `"${business_name}" <${process.env.GMAIL_USER || 'lerdi890@gmail.com'}>`,
      to: to_email,
      subject: `Appointment Confirmation - ${business_name}`,
      html: generateEmailHTML(templateParams),
      text: generateEmailText(templateParams) // Plain text fallback
    };

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log('[send-appointment-confirmation] Email sent successfully, messageId:', result.messageId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        message: 'Appointment confirmation email sent successfully via Nodemailer'
      })
    };
  } catch (error) {
    console.error('[send-appointment-confirmation] Error:', error?.message || String(error), error?.stack || '');
    
    return {
      statusCode: 200, // Don't fail the booking
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send appointment confirmation email'
      })
    };
  }
};

// Generate the email HTML template: clean layout, optional logo, structured details, solid buttons
function generateEmailHTML(params) {
  const logoBlock = params.business_logo_url
    ? `<div style="text-align: center; padding: 24px 20px 16px;"><img src="${params.business_logo_url}" alt="${params.business_name}" style="max-width: 180px; max-height: 80px; object-fit: contain;" /></div>`
    : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="background: #1e3a5f; color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                ${logoBlock}
                <h1 style="margin: 0; font-size: 1.25rem; color: white;">Appointment Confirmation – ${params.business_name}</h1>
            </div>
            <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
                <p>Hi ${params.to_name},</p>
                <p>Your appointment has been successfully booked.</p>
                <div style="background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f; border-radius: 4px;">
                    <p style="margin: 6px 0;"><strong>Business:</strong> ${params.business_name}</p>
                    ${params.service_name ? `<p style="margin: 6px 0;"><strong>Service:</strong> ${params.service_name}</p>` : ''}
                    <p style="margin: 6px 0;"><strong>Date:</strong> ${params.appointment_date}</p>
                    <p style="margin: 6px 0;"><strong>Time:</strong> ${params.appointment_time}</p>
                </div>
                ${params.confirmation_link ? `
                <p style="text-align: center; margin: 24px 0 8px; font-weight: bold; color: #333;">Please confirm your appointment to secure your booking:</p>
                <p style="text-align: center; margin: 0 0 16px;"><a href="${params.confirmation_link}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Appointment</a></p>
                <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 24px;">This link expires in 48 hours.</p>
                ` : ''}
                ${params.cancel_link ? `
                <p style="margin-top: 16px; color: #666;">To cancel or manage your appointment:</p>
                <p style="text-align: center;"><a href="${params.cancel_link}" style="display: inline-block; background: #4b5563; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Manage Appointment</a></p>
                ` : ''}
                <p style="margin-top: 24px;">We look forward to seeing you!</p>
                <p>Best regards,<br><strong>${params.business_name}</strong></p>
            </div>
            <p style="text-align: center; padding: 16px; color: #999; font-size: 12px;">Sent via Appointly booking system.</p>
        </div>
    </body>
    </html>
  `;
}

// Generate plain text version of the email
function generateEmailText(params) {
  return `
Appointment Confirmed!

Dear ${params.to_name},

Your appointment has been successfully booked. Here are your appointment details:

📅 Appointment Details
Business: ${params.business_name}
Service: ${params.service_name}
Date: ${params.appointment_date}
Time: ${params.appointment_time}

${params.confirmation_link ? `
IMPORTANT: Please confirm your appointment to secure your booking:
${params.confirmation_link}

This confirmation link expires in 48 hours. Your appointment will be added to the calendar once confirmed.
` : ''}

If you need to cancel or reschedule your appointment, please visit:
${params.cancel_link}

We look forward to seeing you!

Best regards,
${params.business_name}

---
This email was sent from Appointly booking system.
If you have any questions, please contact ${params.business_name} directly.
  `;
}

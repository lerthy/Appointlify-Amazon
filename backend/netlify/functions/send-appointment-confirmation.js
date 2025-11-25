// Netlify function that sends appointment confirmation emails using Nodemailer
// This replaces EmailJS with a reliable server-side email solution

const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
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
      service_name 
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
    };

    console.log('Sending appointment confirmation email via Nodemailer:', {
      to: to_email,
      business: business_name,
      service: service_name
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
    console.log('✅ Email sent successfully via Nodemailer:', result.messageId);
    
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
    console.error('Error sending appointment confirmation email:', error);
    
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

// Generate the email HTML template (same format as EmailJS template)
function generateEmailHTML(params) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6A3EE8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6A3EE8; }
            .button { display: inline-block; background: #6A3EE8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Appointment Confirmed!</h1>
            </div>
            <div class="content">
                <p>Dear ${params.to_name},</p>
                <p>Your appointment has been successfully booked. Here are your appointment details:</p>
                
                <div class="details">
                    <h3>📅 Appointment Details</h3>
                    <p><strong>Business:</strong> ${params.business_name}</p>
                    <p><strong>Service:</strong> ${params.service_name}</p>
                    <p><strong>Date:</strong> ${params.appointment_date}</p>
                    <p><strong>Time:</strong> ${params.appointment_time}</p>
                </div>
                
                ${params.confirmation_link ? `
                <p style="text-align: center; margin: 30px 0;">
                    <strong>Please confirm your appointment to secure your booking:</strong>
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${params.confirmation_link}" 
                       style="display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px;">
                        ✅ Confirm Appointment
                    </a>
                </div>
                <p style="color: #666; font-size: 14px; text-align: center;">
                    This confirmation link expires in 48 hours. Your appointment will be added to the calendar once confirmed.
                </p>
                ` : ''}
                
                <p style="margin-top: 30px;">If you need to cancel or reschedule your appointment, please use the link below:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${params.cancel_link}" 
                       style="display: inline-block; background: #6A3EE8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px;">
                        Manage Appointment
                    </a>
                </div>
                
                <p>We look forward to seeing you!</p>
                <p>Best regards,<br>${params.business_name}</p>
            </div>
            <div class="footer">
                <p>This email was sent from Appointly booking system.</p>
                <p>If you have any questions, please contact ${params.business_name} directly.</p>
            </div>
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

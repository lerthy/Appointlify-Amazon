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
    const { to, subject, html, text } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      console.error('Missing required fields:', { to, subject, hasHtml: !!html, hasText: !!text });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, and html or text'
        })
      };
    }

    // Try to send real email if Gmail credentials are configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailAppPassword) {
      try {


        // Configure Nodemailer with Gmail SMTP
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailAppPassword
          }
        });

        // Verify connection
        await transporter.verify();


        // Email content
        const mailOptions = {
          from: `"Appointly" <${gmailUser}>`,
          to: to,
          subject: subject,
          html: html,
          text: text || html?.replace(/<[^>]*>/g, '') || ''
        };

        // Send the email
        const result = await transporter.sendMail(mailOptions);


        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            messageId: result.messageId,
            message: 'Email sent successfully via Gmail'
          })
        };
      } catch (emailError) {
        console.error('❌ Failed to send email via Gmail:', emailError.message);
        console.error('Full error:', emailError);

        // Return error instead of falling through to simulation
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Failed to send email: ${emailError.message}`,
            details: 'Gmail credentials are configured but sending failed. Check your GMAIL_USER and GMAIL_APP_PASSWORD.'
          })
        };
      }
    }

    // Fallback: Log email details if Gmail credentials are not configured
    : ', {
to,
  subject,
  hasHtml: !!html,
    hasText: !!text,
      note: 'Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables to send real emails'
    });

const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    messageId: emailId,
    message: 'Email sent (simulated - configure GMAIL_USER and GMAIL_APP_PASSWORD for real emails)'
  })
};
  } catch (error) {
  console.error('Error sending email:', error);
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      success: false,
      error: error.message || 'Failed to send email'
    })
  };
}
};

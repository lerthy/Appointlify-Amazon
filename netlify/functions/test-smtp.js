const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER;
const FROM_NAME = process.env.FROM_NAME || 'Appointly';

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

  try {
    console.log('🔧 SMTP Configuration Test Starting...');
    
    // Show SMTP config (without passwords)
    const config = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      from: FROM_EMAIL,
      name: FROM_NAME,
      passLength: SMTP_PASS ? SMTP_PASS.length : 0
    };
    
    console.log('📋 SMTP Config:', config);

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing SMTP configuration',
          config: config
        })
      };
    }

    // Create transporter
    console.log('🔧 Creating transporter...');
    const transporter = nodemailer.createTransporter({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: parseInt(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Enable debug logging
      logger: true
    });

    // Test 1: Verify connection
    console.log('🔍 Test 1: Verifying SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'SMTP verification failed',
          details: verifyError.message,
          code: verifyError.code,
          config: config
        })
      };
    }

    // Test 2: Send test email
    const { email } = JSON.parse(event.body || '{"email":"test@example.com"}');
    const testEmail = email || 'test@example.com';

    console.log('📧 Test 2: Sending test email to:', testEmail);

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: testEmail,
      subject: '🧪 SMTP Test Email - Appointly',
      text: `This is a test email to verify SMTP configuration.
      
Sent at: ${new Date().toISOString()}
From: ${FROM_EMAIL}
Host: ${SMTP_HOST}
Port: ${SMTP_PORT}

If you receive this, your SMTP configuration is working correctly!`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">🧪 SMTP Test Email</h2>
        <p>This is a test email to verify your SMTP configuration.</p>
        <ul>
          <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
          <li><strong>From:</strong> ${FROM_EMAIL}</li>
          <li><strong>Host:</strong> ${SMTP_HOST}</li>
          <li><strong>Port:</strong> ${SMTP_PORT}</li>
        </ul>
        <p style="color: green;">✅ If you receive this, your SMTP configuration is working correctly!</p>
      </div>`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'SMTP test completed successfully!',
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info),
          to: testEmail,
          config: config
        })
      };

    } catch (sendError) {
      console.error('❌ Failed to send test email:', sendError.message);
      console.error('Error code:', sendError.code);
      console.error('Full error:', sendError);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send test email',
          details: sendError.message,
          code: sendError.code,
          config: config
        })
      };
    }

  } catch (error) {
    console.error('💥 SMTP test error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'SMTP test failed',
        details: error.message
      })
    };
  }
};

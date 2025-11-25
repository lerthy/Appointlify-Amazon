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

    // For now, we'll use a simple email service or just log the email
    // In production, you would integrate with SendGrid, AWS SES, or similar
    console.log('Email would be sent:', {
      to,
      subject,
      html: html ? 'HTML content provided' : 'No HTML',
      text: text ? 'Text content provided' : 'No text'
    });

    // Simulate successful email sending
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: emailId,
        message: 'Email sent successfully (simulated)'
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

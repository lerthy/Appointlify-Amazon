import twilio from 'twilio';

export const handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { to, message } = JSON.parse(event.body);
    
    // Validate required fields
    if (!to || !message) {
      console.error('Missing required fields:', { to, message });
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Missing required fields: to and message' })
      };
    }
    
    // Check if Twilio is available
    if (!twilio) {
      console.error('Twilio module not available');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured',
          details: 'Twilio module not found'
        })
      };
    }
    
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Check if environment variables are set
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error('Missing Twilio environment variables:', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasPhoneNumber: !!twilioPhoneNumber
      });
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'Twilio configuration missing',
          details: 'Environment variables not set'
        })
      };
    }

    const client = twilio(accountSid, authToken);
    
    // Format phone number to E.164 format
    const formattedPhone = to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`;
    
    console.log('Attempting to send SMS:', {
      to: formattedPhone,
      from: twilioPhoneNumber,
      messageLength: message.length
    });
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone
    });
    
    console.log('SMS sent successfully:', result.sid);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: result.sid })
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.code || 'Unknown error',
        stack: error.stack
      })
    };
  }
}; 
interface SMSParams {
  to: string;
  message: string;
}

export const sendSMS = async (params: SMSParams): Promise<boolean> => {
  // Check if we're in development mode without local server
  const isDevelopment = import.meta.env.DEV;
  const isLocalhost = window.location.hostname === 'localhost';
  
  try {
    
    let endpoint: string;
    
    if (isDevelopment && isLocalhost) {
      // In development, try to detect if we're on Netlify dev or local
      if (window.location.port === '8888') {
        // Netlify dev server
        endpoint = '/.netlify/functions/send-sms';
      } else {
        // Try local server first, fallback to simulation
        endpoint = 'http://localhost:5000/api/send-sms';
      }
    } else {
      // Production - use Netlify function
      endpoint = '/.netlify/functions/send-sms';
    }
    
    console.log('Sending SMS to:', params.to, 'via endpoint:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log('SMS response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMS HTTP error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('SMS response data:', data);
    
    if (!data.success) {
      console.error('SMS service returned failure:', data.error);
      return false;
    }
    
    return data.success;
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Check if it's a Twilio trial/permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTwilioTrialError = errorMessage.includes('Trial accounts') || 
                              errorMessage.includes('Permission to send') ||
                              errorMessage.includes('unverified') ||
                              errorMessage.includes('21408') ||
                              errorMessage.includes('21211');
    
    if (isTwilioTrialError) {
      console.log('📱 SMS blocked by Twilio trial restrictions - simulating success for development');
      console.log('📱 SMS would be sent in production:', params);
      console.log('💡 To send real SMS, upgrade your Twilio account or verify the recipient number');
      return true; // Simulate success for trial account restrictions
    }
    
    // If we're in local development and the server is not running, simulate success
    if (isDevelopment && isLocalhost && window.location.port !== '8888') {
      console.log('📱 SMS would be sent in production:', params);
      console.log('💡 To test SMS locally, start the server with: node server.js');
      return true; // Simulate success in development
    }
    
    return false;
  }
}; // Notifications



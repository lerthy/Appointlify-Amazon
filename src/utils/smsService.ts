interface SMSParams {
  to: string;
  message: string;
}

export const sendSMS = async (params: SMSParams): Promise<boolean> => {
  try {
    // Use local server endpoint for development, Netlify function for production
    const isDevelopment = import.meta.env.DEV;
    const endpoint = isDevelopment ? 'http://localhost:3001/api/send-sms' : '/.netlify/functions/send-sms';
    
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
    return false;
  }
}; // Notifications

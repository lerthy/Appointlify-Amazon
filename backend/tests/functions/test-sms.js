exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Test function working',
      environment: {
        hasTwilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasTwilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasTwilioPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    })
  };
}; 
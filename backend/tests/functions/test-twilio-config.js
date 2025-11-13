exports.handler = async function(event, context) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Check if environment variables exist
    const envStatus = {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasPhoneNumber: !!phoneNumber,
      accountSidFormat: accountSid ? (accountSid.startsWith('AC') && accountSid.length === 34) : false,
      authTokenFormat: authToken ? authToken.length === 32 : false,
      phoneNumberFormat: phoneNumber ? phoneNumber.startsWith('+') : false
    };

    // Test Twilio connection (without sending SMS)
    let twilioTest = null;
    if (envStatus.hasAccountSid && envStatus.hasAuthToken) {
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        
        // Try to fetch account info to test credentials
        const account = await client.api.accounts(accountSid).fetch();
        twilioTest = {
          success: true,
          accountName: account.friendlyName,
          accountStatus: account.status
        };
      } catch (error) {
        twilioTest = {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Twilio configuration test',
        environment: envStatus,
        twilioConnection: twilioTest,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

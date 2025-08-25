# Netlify Functions

This directory contains Netlify serverless functions for the appointment booking system.

## Functions

### `send-sms.js`
Handles SMS sending via Twilio API.

**Required Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### `test-sms.js`
Test function to verify environment variables and function availability.

### `chat.js`
Handles AI chatbot conversations using OpenAI GPT-3.5 Turbo or fallback mock service.

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key (optional, will use mock service if not set)
- `USE_OPENAI` - Set to 'true' to enable OpenAI (optional, defaults to mock service)

### `book-appointment.js`
Handles appointment booking requests and creates booking records.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in Netlify dashboard:
   - Go to Site settings → Environment variables
   - Add the Twilio variables listed above
   - Add OpenAI variables if you want to use real AI (optional)

3. Deploy to trigger function installation

## Testing

After deployment, you can test the functions:

- Test function: `https://your-site.netlify.app/.netlify/functions/test-sms`
- SMS function: `https://your-site.netlify.app/.netlify/functions/send-sms`
- Chat function: `https://your-site.netlify.app/.netlify/functions/chat`
- Booking function: `https://your-site.netlify.app/.netlify/functions/book-appointment`

## Troubleshooting

If SMS is failing:

1. Check Netlify function logs in the dashboard
2. Verify environment variables are set correctly
3. Ensure Twilio credentials are valid
4. Check phone number format (should be E.164 format) 
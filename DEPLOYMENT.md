# Deployment Guide

## Netlify Deployment

### Prerequisites
- Twilio account with Account SID, Auth Token, and Phone Number
- Netlify account

### Step 1: Deploy to Netlify

1. Connect your repository to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Step 2: Configure Environment Variables

In your Netlify dashboard:

1. Go to **Site settings** → **Environment variables**
2. Add these variables:
   ```
   TWILIO_ACCOUNT_SID = your_twilio_account_sid
   TWILIO_AUTH_TOKEN = your_twilio_auth_token
   TWILIO_PHONE_NUMBER = your_twilio_phone_number
   ```

### Step 3: Test the Functions

After deployment, test the functions:

1. **Test function** (to verify setup):
   ```
   https://your-site.netlify.app/.netlify/functions/test-sms
   ```

2. **SMS function** (for actual SMS sending):
   ```
   https://your-site.netlify.app/.netlify/functions/send-sms
   ```

### Step 4: Verify SMS is Working

1. Make a test appointment booking
2. Check browser console for detailed logs
3. Check Netlify function logs in dashboard
4. Verify SMS is received

## Troubleshooting

### Common Issues

1. **500 Error on SMS Function**
   - Check if environment variables are set
   - Verify Twilio credentials are correct
   - Check Netlify function logs

2. **"Twilio module not found"**
   - Ensure `npm run build:functions` runs during deployment
   - Check that `netlify/functions/package.json` exists

3. **"Environment variables not set"**
   - Double-check variable names in Netlify dashboard
   - Ensure no extra spaces in values
   - Redeploy after adding variables

### Debugging Steps

1. **Check Function Logs**:
   - Go to Netlify dashboard → Functions
   - Click on function name to view logs

2. **Test Environment Variables**:
   - Visit the test function URL
   - Check response for environment variable status

3. **Verify Phone Number Format**:
   - Ensure phone numbers are in E.164 format (+1234567890)
   - Remove any special characters

### Support

If issues persist:
1. Check Netlify function logs for detailed error messages
2. Verify Twilio account is active and has credits
3. Test with a simple phone number first 
# Netlify Deployment Fix for AI Chatbot

## Problem
The AI chatbot was trying to connect to `http://localhost:3001` which doesn't work in production on Netlify.

## Solution
I've created Netlify Functions to replace the local server endpoints.

## What I Fixed

### 1. Created Netlify Functions
- `netlify/functions/chat.js` - Handles AI chatbot conversations
- `netlify/functions/book-appointment.js` - Handles appointment booking

### 2. Updated AIChatbot Component
- Changed API endpoints from `http://localhost:3001/api/chat` to `/.netlify/functions/chat`
- Changed booking endpoint from `http://localhost:3001/api/book-appointment` to `/.netlify/functions/book-appointment`

### 3. Added Dependencies
- Added `openai` package to `netlify/functions/package.json`

## Environment Variables to Set in Netlify

Go to your Netlify dashboard → Site settings → Environment variables and add:

### For OpenAI (Optional - will use mock service if not set)
- `OPENAI_API_KEY` - Your OpenAI API key
- `USE_OPENAI` - Set to `true` to enable OpenAI

### For SMS (Optional)
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

## How It Works

1. **With OpenAI**: If you set `OPENAI_API_KEY` and `USE_OPENAI=true`, the chatbot will use GPT-3.5 Turbo
2. **Without OpenAI**: The chatbot will use a smart mock service that can handle basic booking conversations
3. **Fallback**: If OpenAI fails, it automatically falls back to the mock service

## Testing

After deployment, you can test the functions at:
- `https://your-site.netlify.app/.netlify/functions/chat`
- `https://your-site.netlify.app/.netlify/functions/book-appointment`

## Next Steps

1. Commit and push these changes to your repository
2. Netlify will automatically redeploy
3. Set the environment variables in Netlify dashboard
4. Test the AI chatbot on your live site

The chatbot will now work in production! 🎉

# OpenAI Setup Guide for Your Chatbot

## Quick Setup Steps

### 1. Get Your OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Add a payment method at [Billing](https://platform.openai.com/account/billing)
4. Create an API key at [API Keys](https://platform.openai.com/api-keys)
5. Copy the API key (starts with `sk-proj-...`)

### 2. Update Your .env File

Once you have your API key, update your `.env` file:

```env
# Replace this line in your .env file:
OPENAI_API_KEY=your_openai_api_key_here

# With your actual API key:
OPENAI_API_KEY=sk-proj-your-actual-api-key-here

# Enable OpenAI (change from false to true):
USE_OPENAI=true
```

### 3. Restart Your Server

```bash
# Stop your current server (Ctrl+C if running in foreground)
# Then restart:
npm run server
```

### 4. Test OpenAI Connection

```bash
node test-openai.js
```

You should see:
```
✅ OpenAI connection successful!
🤖 AI Response: [OpenAI response]
```

## Pricing Information

### Free Credits
- New accounts get $5 in free credits
- Credits expire after 3 months
- Perfect for testing and development

### Pay-as-you-go Pricing (GPT-3.5 Turbo)
- **Input**: $0.50 per 1M tokens (~750k words)
- **Output**: $1.50 per 1M tokens (~750k words)
- **Typical chat message**: 10-50 tokens
- **Cost per conversation**: $0.001-0.01 (very affordable!)

### Example Usage Costs
- 100 conversations = ~$0.10-1.00
- 1,000 conversations = ~$1.00-10.00
- Very cost-effective for small businesses!

## Setting Usage Limits

1. Go to [Usage Limits](https://platform.openai.com/account/limits)
2. Set a monthly limit (e.g., $10-20)
3. Get email alerts at 75% and 100% usage

## Security Best Practices

### ✅ DO:
- Keep API keys in `.env` files only
- Set reasonable usage limits
- Monitor usage regularly
- Use environment variables in production

### ❌ DON'T:
- Share API keys publicly
- Commit API keys to Git
- Use API keys in frontend code
- Set unlimited spending

## Troubleshooting

### "Invalid API Key" Error
- Double-check the API key is copied correctly
- Ensure no extra spaces or characters
- Make sure the key starts with `sk-proj-` or `sk-`

### "Quota Exceeded" Error
- Check your billing page for remaining credits
- Add more credits or set up auto-recharge
- Verify your usage limits

### "Rate Limit" Error
- You're sending requests too quickly
- Add delays between requests if needed
- Upgrade to higher tier for more requests

## Current Fallback System

Your chatbot already has a smart fallback system:

1. **Primary**: Tries OpenAI API (when configured)
2. **Fallback**: Uses mock AI service (if OpenAI fails)
3. **Always Works**: Your chatbot never goes down!

## Testing Your Setup

### Test Commands

```bash
# Test OpenAI connection
node test-openai.js

# Test the chat API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"context":{}}'
```

### Expected Success Response
```json
{
  "success": true,
  "message": "Hello! How can I help you book an appointment today?",
  "provider": "openai",
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 15,
    "total_tokens": 135
  }
}
```

## Free Alternatives (If Needed)

If you need a completely free solution:

1. **Keep Mock AI**: Your current mock AI works great
2. **Hugging Face**: Free AI models (limited)
3. **Cohere**: Free tier available
4. **Local Models**: Run AI models locally

## Production Recommendations

### For Small Business (< 1000 chats/month)
- OpenAI GPT-3.5 Turbo
- $5-20/month budget
- Set $20 monthly limit

### For Medium Business (1000-10000 chats/month)
- OpenAI GPT-3.5 Turbo or GPT-4
- $20-100/month budget
- Monitor usage weekly

### For Large Business (10000+ chats/month)
- Consider OpenAI enterprise plans
- Dedicated support
- Custom rate limits

---

**Your chatbot works perfectly right now with the mock AI service. OpenAI will make it even smarter, but it's completely optional!** 🚀

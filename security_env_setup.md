# 🔐 Security Environment Variables Setup

## Required Environment Variables

Add these to your Netlify environment variables and your local `.env` file:

### 🔑 **API Security**
```bash
# MCP API Key - Generate a strong random key
MCP_API_KEY=your-super-secret-mcp-api-key-here

# Frontend URL for CORS (replace with your actual domain)
FRONTEND_URL=https://appointly-ks.netlify.app
```

### 🌐 **Existing Variables (verify these are set)**
```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# AI Services
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
HUGGINGFACE_API_KEY=your-huggingface-key

# Email
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## 📝 **How to Generate MCP_API_KEY**

### Option 1: Using Node.js
```javascript
// Run this in Node.js console
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

### Option 3: Using Online Generator
- Visit a secure random string generator
- Generate a 64-character hex string
- Use that as your `MCP_API_KEY`

## 🔧 **Netlify Environment Variables Setup**

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add the following variables:

| Variable Name | Value | Notes |
|---------------|--------|--------|
| `MCP_API_KEY` | `your-generated-key` | 64-char hex string |
| `FRONTEND_URL` | `https://your-domain.netlify.app` | Your actual domain |

## 🔒 **Local Development Setup**

Update your `.env` file:
```bash
# Add these new security variables
MCP_API_KEY=your-generated-key-for-development
FRONTEND_URL=http://localhost:5173

# Verify existing variables are present
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
# ... other existing variables
```

## ✅ **Verification Steps**

### 1. Test MCP Authentication
```bash
# This should fail with 401 Unauthorized
curl -X POST https://your-domain.netlify.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "test"}'

# This should work with correct API key
curl -X POST https://your-domain.netlify.app/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-mcp-api-key" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "query-knowledge", "arguments": {"question": "test"}}, "id": 1}'
```

### 2. Test CORS Configuration
- Open browser developer tools
- Try to access your chat from a different domain
- Should be blocked if CORS is properly configured

### 3. Test Rate Limiting
- Make rapid requests to your MCP endpoint
- Should get 429 status after 30 requests per minute

## 🚨 **Security Checklist**

- [ ] `MCP_API_KEY` is set and unique
- [ ] `FRONTEND_URL` points to your actual domain (not `*`)
- [ ] Supabase RLS policies are applied (run `setup_rls_security.sql`)
- [ ] Test that unauthorized requests are blocked
- [ ] Test that rate limiting works
- [ ] Verify input validation is working

## 🔄 **After Deployment**

1. **Test the chat functionality** - Ensure it still works with the new security
2. **Monitor logs** - Check for any authentication errors
3. **Test from different IPs** - Verify rate limiting
4. **Update documentation** - Inform your team about the new API key

## 🆘 **Troubleshooting**

### Chat stopped working after security update:
```bash
# Check if MCP_API_KEY is set in Netlify
# Check browser console for CORS errors
# Verify the API key in your environment matches
```

### Getting 401 errors:
```bash
# Verify MCP_API_KEY is exactly the same in both:
# 1. Netlify environment variables
# 2. Your function's process.env.MCP_API_KEY
```

### CORS errors:
```bash
# Make sure FRONTEND_URL matches your actual domain
# Include protocol (https://)
# No trailing slash
```

---

**⚠️ Important**: After setting these variables, redeploy your Netlify functions for the changes to take effect.

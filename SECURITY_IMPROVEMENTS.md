# Security Improvement Guide

## 🚀 **Immediate Actions Taken**

### ✅ **Enhanced Input Validation**
- Added field whitelisting for database queries
- Improved SQL injection protection
- Stronger parameter validation

### ✅ **Security Logging**
- Added comprehensive audit logging
- Enhanced rate limiting with logging
- Security event tracking

## 🔥 **Critical Next Steps**

### **1. Replace Service Role Key (HIGH PRIORITY)**

**Current Risk**: Service role key bypasses all security policies.

**Solution**: Implement proper authentication context.

```javascript
// Create: netlify/functions/auth-mcp.js
import { createClient } from '@supabase/supabase-js';

async function getAuthenticatedClient(userToken) {
  if (!userToken) {
    throw new Error('User authentication required');
  }
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY, // Use anon key instead of service role
    {
      global: { 
        headers: { Authorization: `Bearer ${userToken}` } 
      }
    }
  );
}

// Update chat function to pass user context
async function getEnhancedContext(chatContext, userToken) {
  const supabase = await getAuthenticatedClient(userToken);
  // Now queries respect RLS policies
}
```

### **2. Implement Request Signing**

```javascript
// Add to both chat.js and mcp.js
import crypto from 'crypto';

function createSignedRequest(body, apiKey) {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = crypto
    .createHmac('sha256', process.env.MCP_SECRET)
    .update(payload)
    .digest('hex');
  
  return {
    headers: {
      'x-api-key': apiKey,
      'x-timestamp': timestamp,
      'x-signature': signature
    }
  };
}
```

### **3. Add Row-Level Security (RLS)**

```sql
-- Run in Supabase SQL editor
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can see only their own data" 
ON users FOR ALL 
USING (auth.uid() = id);

CREATE POLICY "Services visible to business owners" 
ON services FOR SELECT 
USING (
  business_id = auth.uid() OR
  business_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Public read for booking" 
ON services FOR SELECT 
USING (true); -- Allow chatbot to see services

CREATE POLICY "Appointments for business owners" 
ON appointments FOR ALL 
USING (business_id = auth.uid());
```

## 🔸 **Medium Priority Improvements**

### **4. Environment Variable Security**

Create `.env.example`:
```bash
# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
MCP_API_KEY=generate-strong-random-key
MCP_SECRET=generate-strong-secret-for-signing

# External APIs
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key

# Frontend
FRONTEND_URL=https://appointly-ks.netlify.app
```

### **5. Enhanced Rate Limiting with Redis**

```javascript
// For production, use Redis instead of in-memory
import Redis from 'ioredis';

class RedisRateLimit {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async checkLimit(clientId, maxRequests = 30, windowMs = 60000) {
    const key = `rate_limit:${clientId}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return current <= maxRequests;
  }
}
```

### **6. Input Validation Schema**

```javascript
// Add to mcp.js
import { z } from 'zod';

const tableQuerySchema = z.object({
  table: z.enum(['users', 'services', 'appointments', 'customers']),
  select: z.string().regex(/^[a-zA-Z0-9_,\s\*]+$/),
  limit: z.number().min(1).max(100),
  eq: z.record(z.string()).optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'name', 'date']).optional()
});

// Validate all inputs
function validateQuery(args) {
  return tableQuerySchema.parse(args);
}
```

## 🔍 **Monitoring & Alerting**

### **7. Security Monitoring**

```javascript
// Add to security logging
async function sendSecurityAlert(event) {
  if (event.type === 'UNAUTHORIZED_ACCESS' || 
      event.type === 'RATE_LIMIT_EXCEEDED') {
    
    // Send to monitoring service
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Security Alert: ${event.type}`,
        details: event
      })
    });
  }
}
```

## 📊 **Implementation Priority**

1. **🔥 CRITICAL**: Replace service role key with user auth
2. **🔥 HIGH**: Add request signing
3. **🔸 MEDIUM**: Implement RLS policies
4. **🔸 MEDIUM**: Enhanced logging & monitoring
5. **⭐ LOW**: Redis rate limiting
6. **⭐ LOW**: Advanced input validation

## 🧪 **Testing Security**

```bash
# Test rate limiting
for i in {1..35}; do
  curl -X POST https://your-site/.netlify/functions/mcp \
    -H "x-api-key: wrong-key" \
    -d '{"test": true}'
done

# Test input validation
curl -X POST https://your-site/.netlify/functions/mcp \
  -H "x-api-key: your-key" \
  -d '{"method": "tools/call", "params": {"name": "fetch-table", "arguments": {"table": "malicious_table"}}}'
```

## 📈 **Security Score**

**Current**: 6/10 ⚠️  
**After improvements**: 9/10 ✅

**Biggest wins:**
- Service role → User auth: +2 points
- Request signing: +1 point  
- Enhanced validation: +1 point

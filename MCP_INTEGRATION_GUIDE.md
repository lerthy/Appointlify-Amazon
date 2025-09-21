# MCP Integration Guide

## 🎉 What's New

Your chat function now integrates with MCP (Model Context Protocol) to provide **RAG (Retrieval Augmented Generation)** capabilities! This means your AI chatbot can now:

- ✅ Query your knowledge base for relevant information
- ✅ Provide more accurate and contextual responses
- ✅ Access business policies, procedures, and FAQs
- ✅ Give personalized recommendations based on stored knowledge

## 🔧 How It Works

### 1. **Enhanced Chat Flow**
```
User Question → Chat Function → MCP Knowledge Query → AI Response with Context
```

### 2. **MCP Integration Points**
- **Knowledge Querying**: Each user message triggers a semantic search of your knowledge base
- **Context Enhancement**: Retrieved knowledge is added to the AI's system prompt
- **Response Enrichment**: AI responses are informed by relevant business information

### 3. **Response Metadata**
Your chat responses now include:
```json
{
  "success": true,
  "message": "AI response...",
  "provider": "groq|openai|mock",
  "mcpKnowledgeUsed": 3,
  "context": {
    "businesses": 5,
    "services": 12,
    "knowledge": 3
  }
}
```

## 🧪 Testing Your MCP Integration

### Step 1: Populate Knowledge Base
```bash
# Add sample knowledge to test RAG functionality
node ingest-sample-knowledge.js
```

### Step 2: Test MCP Integration
```bash
# Test the complete integration
node test-mcp-integration.js
```

### Step 3: Test in Your App
1. Open your deployed Netlify app
2. Start a chat conversation
3. Ask questions like:
   - "What are your business hours?"
   - "Do you accept insurance?"
   - "What is your cancellation policy?"
   - "What should I bring to my appointment?"

## 📊 Monitoring MCP Usage

### Netlify Function Logs
Check your Netlify dashboard → Functions → View logs for:
```
chat.js: Querying MCP knowledge for: [user question]
chat.js: MCP returned 3 knowledge items
chat.js: MCP Knowledge Used: 3
```

### Response Metadata
Look for these fields in chat responses:
- `mcpKnowledgeUsed`: Number of knowledge items retrieved
- `context.knowledge`: Number of knowledge items used
- `provider`: Which AI provider was used

## 🔍 Verifying MCP is Working

### 1. **Check Function Logs**
- Go to Netlify Dashboard → Functions → View logs
- Look for MCP-related log messages
- Verify knowledge queries are being made

### 2. **Test Direct MCP Access**
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "query-knowledge",
      "arguments": {
        "question": "appointment booking",
        "matchCount": 3
      }
    }
  }'
```

### 3. **Compare Responses**
- Ask the same question before and after MCP integration
- Notice more detailed, contextual responses
- Check response metadata for `mcpKnowledgeUsed` > 0

## 📚 Managing Your Knowledge Base

### Adding New Knowledge
Use the MCP `ingest-text` tool:
```javascript
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ingest-text",
    "arguments": {
      "source": "your-source",
      "content": "Your knowledge content here",
      "metadata": { "category": "policy", "priority": "high" }
    }
  }
}
```

### Querying Knowledge
Use the MCP `query-knowledge` tool:
```javascript
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "query-knowledge",
    "arguments": {
      "question": "your question",
      "matchCount": 5,
      "minSimilarity": 0.1
    }
  }
}
```

## 🚀 Benefits of MCP Integration

### For Your Business
- **Smarter Responses**: AI has access to your specific business information
- **Consistent Information**: All responses are based on your actual policies
- **Reduced Support Load**: AI can answer common questions accurately
- **Better Customer Experience**: More helpful and relevant responses

### For Your Customers
- **Accurate Information**: Get correct business hours, policies, procedures
- **Personalized Service**: AI understands your specific services and offerings
- **Faster Support**: Immediate answers to common questions
- **Better Booking Experience**: More informed appointment scheduling

## 🔧 Troubleshooting

### MCP Not Working?
1. **Check Environment Variables**:
   - `NETLIFY_URL` (for deployed functions)
   - `OPENAI_API_KEY` (for embeddings)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Check Function Logs**:
   - Look for MCP-related errors
   - Verify knowledge queries are being made
   - Check for network connectivity issues

3. **Test MCP Function Directly**:
   - Use the test scripts provided
   - Verify MCP endpoint is accessible
   - Check knowledge base has content

### No Knowledge Retrieved?
1. **Populate Knowledge Base**:
   - Run `ingest-sample-knowledge.js`
   - Add your own business information
   - Verify embeddings are being created

2. **Check Similarity Threshold**:
   - Lower `minSimilarity` in queries
   - Try different question phrasings
   - Verify knowledge content is relevant

## 📈 Next Steps

### Enhance Your Knowledge Base
1. **Add Business-Specific Content**:
   - Your actual business hours
   - Your specific services and pricing
   - Your cancellation and refund policies
   - Your contact information and location

2. **Categorize Knowledge**:
   - Use metadata to organize content
   - Set priority levels for important information
   - Create topic-specific knowledge sources

3. **Monitor and Improve**:
   - Track which knowledge is most useful
   - Add new content based on customer questions
   - Refine similarity thresholds for better matching

### Advanced Features
- **Dynamic Knowledge Updates**: Automatically update knowledge from your database
- **Customer-Specific Context**: Use customer history to personalize responses
- **Multi-Language Support**: Add knowledge in different languages
- **Analytics**: Track knowledge usage and effectiveness

---

## 🎯 Summary

Your chat function now has **RAG capabilities** through MCP integration! This means:

✅ **MCP is actively being used** - check logs and response metadata  
✅ **Knowledge base queries** happen with every user message  
✅ **Enhanced AI responses** with your business context  
✅ **Better customer experience** with accurate, helpful information  

The integration is working when you see `mcpKnowledgeUsed > 0` in chat responses and MCP-related logs in your Netlify function logs.

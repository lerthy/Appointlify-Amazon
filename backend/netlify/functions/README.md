# Netlify Functions

This directory contains Netlify serverless functions for the appointment booking system.

## Functions

### MCP (Model Context Protocol)

An HTTP MCP endpoint is available at `/.netlify/functions/mcp` using the Netlify guide's Streamable HTTP transport. It exposes tools to read from and write to Supabase.

Client config example (via proxy for compatibility):

```json
{
  "mcpServers": {
    "supabase-remote": {
      "command": "npx",
      "args": ["mcp-remote@next", "https://<your-site>/.netlify/functions/mcp"]
    }
  }
}
```

Reference: Building MCPs with Netlify: https://developers.netlify.com/guides/write-mcps-on-netlify/

#### RAG (pgvector) tools

SQL setup file: `supabase_pgvector_setup.sql` (run in Supabase SQL editor):
- enables `vector` extension
- creates `public.knowledge` table and `match_knowledge` RPC

Tools exposed:
- `ingest-text(source, content, metadata?)`: embeds with `EMBEDDING_MODEL` and stores
- `query-knowledge(question, matchCount?, minSimilarity?)`: returns top matches via `match_knowledge`

Required env:
- `OPENAI_API_KEY` (or swap to another embedding provider)
- `EMBEDDING_MODEL` (default: `text-embedding-3-small`)

### `send-sms.js`
Handles SMS sending via Twilio API.

**Required Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### `test-sms.js`
Test function to verify environment variables and function availability.

### `chat.js`
Handles AI chatbot conversations preferring Groq (Llama 3.1) when configured, then OpenAI, then mock.

**Environment Variables:**
- Groq (preferred, low-cost/free tier):
  - `GROQ_API_KEY`
  - `GROQ_MODEL` (default: `llama-3.1-8b-instant`)
- OpenAI (fallback):
  - `OPENAI_API_KEY`
  - `USE_OPENAI` (set to 'true' to enable)

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
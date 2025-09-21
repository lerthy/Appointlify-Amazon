# 🗄️ Supabase Knowledge Base Setup

## 🎯 **Quick Fix for MCP Knowledge Base**

The error you're seeing is because the `match_knowledge` function doesn't exist in your Supabase database. Here's how to fix it:

## 📋 **Step 1: Run SQL Setup**

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Open your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Setup Script**
   - Copy the contents of `supabase_pgvector_setup_free.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

## 📄 **SQL Script Contents**

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create knowledge table with 384-dimensional embeddings (Hugging Face)
create table if not exists public.knowledge (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector(384) not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.knowledge enable row level security;
create policy "read_knowledge" on public.knowledge for select using (true);

-- Create the match_knowledge function
create or replace function public.match_knowledge(
  query_embedding vector(384),
  match_count int default 5,
  min_similarity float default 0.0
)
returns table (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  similarity float
) as $$
  select k.id,
         k.source,
         k.content,
         k.metadata,
         1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge k
  where 1 - (k.embedding <=> query_embedding) >= min_similarity
  order by k.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

-- Grant permissions
grant execute on function public.match_knowledge(vector, int, float) to anon, authenticated;
grant all on public.knowledge to service_role;
grant execute on function public.match_knowledge(vector, int, float) to service_role;
```

## 🧪 **Step 2: Test the Setup**

After running the SQL, test with:

```bash
# Test knowledge ingestion
node ingest-sample-knowledge.js

# Test knowledge querying
curl -X POST https://appointly-ks.netlify.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query-knowledge","arguments":{"question":"business hours","matchCount":3}}}'
```

## ✅ **Expected Results**

After setup, you should see:
- ✅ Knowledge ingestion succeeds
- ✅ Knowledge queries return results
- ✅ Chat function uses knowledge (`mcpKnowledgeUsed > 0`)

## 🔧 **Troubleshooting**

### If you get permission errors:
```sql
-- Grant additional permissions
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
```

### If the table already exists:
```sql
-- Drop and recreate (if needed)
drop table if exists public.knowledge cascade;
-- Then run the full setup script again
```

## 🎉 **What This Enables**

Once set up, your MCP integration will:
- ✅ Store knowledge with free embeddings
- ✅ Query knowledge semantically
- ✅ Provide contextual AI responses
- ✅ Work completely free (no OpenAI costs)

## 📊 **Verification**

Check that everything works:
1. **SQL runs without errors** ✅
2. **Knowledge ingestion succeeds** ✅  
3. **Knowledge queries return results** ✅
4. **Chat function uses knowledge** ✅

Your MCP knowledge base will then be fully functional with free embeddings! 🚀

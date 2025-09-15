-- Enable pgvector extension
create extension if not exists vector;

-- Create a simple knowledge table for RAG
create table if not exists public.knowledge (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  content text not null,
  metadata jsonb not null default '{}',
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Optional RLS with safe defaults (adjust as needed)
alter table public.knowledge enable row level security;
do $$ begin
  create policy "read_knowledge" on public.knowledge
    for select using (true);
exception when duplicate_object then null; end $$;

-- Use a function to perform fast similarity search via RPC
create or replace function public.match_knowledge(
  query_embedding vector(1536),
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

grant execute on function public.match_knowledge(vector, int, float) to anon, authenticated;
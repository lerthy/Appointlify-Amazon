-- Google OAuth identity + calendar separation
create extension if not exists "uuid-ossp";

create table if not exists google_identity_credentials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  google_sub text not null unique,
  email text not null,
  full_name text,
  picture text,
  access_token text,
  refresh_token text,
  id_token text,
  scope text[],
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_identity_user on google_identity_credentials(user_id);

create table if not exists google_calendar_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  google_sub text not null,
  refresh_token text,
  access_token text,
  scope text[],
  expires_at timestamptz,
  status text not null default 'linked',
  failure_count integer not null default 0,
  last_health_check timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_google_calendar_user on google_calendar_tokens(user_id);
create index if not exists idx_google_calendar_status on google_calendar_tokens(status);

create table if not exists google_consent_audit (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  google_sub text,
  event_type text not null,
  scopes text[],
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_google_consent_user on google_consent_audit(user_id);
create index if not exists idx_google_consent_event on google_consent_audit(event_type);

alter table users
  add column if not exists calendar_linked boolean not null default false,
  add column if not exists calendar_scope_version text,
  add column if not exists calendar_last_prompted timestamptz,
  add column if not exists signup_method text default 'email';


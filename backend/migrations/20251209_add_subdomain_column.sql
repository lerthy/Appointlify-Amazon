-- Add subdomain column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subdomain text;

-- Add checking constraint to ensure valid characters (optional but recommended)
-- Only lowercase alphanumeric and hyphens allowed
ALTER TABLE public.users 
ADD CONSTRAINT check_subdomain_format 
CHECK (subdomain ~* '^[a-z0-9-]+$');

-- Create an index for faster lookups (since we'll query by subdomain)
CREATE INDEX IF NOT EXISTS idx_users_subdomain ON public.users(subdomain);

-- Add unique constraint to ensure unique subdomains
ALTER TABLE public.users 
ADD CONSTRAINT users_subdomain_key UNIQUE (subdomain);

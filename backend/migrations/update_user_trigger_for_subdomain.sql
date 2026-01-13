-- Add subdomain column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subdomain text;

-- Add checking constraints to ensure subdomain is unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_subdomain_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_subdomain_key UNIQUE (subdomain);
    END IF;
END $$;

-- Update the handle_new_user trigger function to include subdomain
-- NOTE: Please verify the function name is 'handle_new_user' in your database.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
begin
  insert into public.users (
    auth_user_id,
    email,
    name,
    phone,
    description,
    logo,
    signup_method,
    subdomain
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'description', ''),
    coalesce(new.raw_user_meta_data->>'logo', ''),
    coalesce(new.raw_user_meta_data->>'signup_method', 'email'),
    coalesce(new.raw_user_meta_data->>'subdomain', '')
  );
  return new;
end;
$$;

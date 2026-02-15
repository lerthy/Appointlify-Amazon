-- Ensure email verification columns exist on users (idempotent)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_token text,
  ADD COLUMN IF NOT EXISTS email_verification_token_expires timestamptz;

-- Update handle_new_user trigger to set email_verified from metadata or signup method
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
declare
  meta_verified text := coalesce(new.raw_user_meta_data->>'email_verified', '');
  signup_method text := coalesce(new.raw_user_meta_data->>'signup_method', 'email');
  is_verified boolean;
begin
  -- Email is verified if: metadata says true, or signup_method is google
  is_verified := (meta_verified = 'true' OR lower(signup_method) = 'google');

  insert into public.users (
    auth_user_id,
    email,
    name,
    phone,
    description,
    logo,
    signup_method,
    subdomain,
    email_verified
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'description', ''),
    coalesce(new.raw_user_meta_data->>'logo', ''),
    coalesce(new.raw_user_meta_data->>'signup_method', 'email'),
    coalesce(new.raw_user_meta_data->>'subdomain', ''),
    is_verified
  );
  return new;
end;
$$;

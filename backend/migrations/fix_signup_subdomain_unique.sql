-- Fix: "Database error saving new user" on second+ email signup
-- Cause: handle_new_user inserted subdomain = '' for every user; UNIQUE (subdomain) allows only one ''.
-- Fix: use NULL when no subdomain (multiple NULLs allowed under UNIQUE in PostgreSQL).

UPDATE public.users
SET subdomain = NULL
WHERE subdomain IS NOT NULL AND btrim(subdomain) = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_verified text := coalesce(new.raw_user_meta_data->>'email_verified', '');
  signup_method text := coalesce(new.raw_user_meta_data->>'signup_method', 'email');
  is_verified boolean;
  raw_sub text := coalesce(new.raw_user_meta_data->>'subdomain', '');
  sub text := nullif(btrim(raw_sub), '');
BEGIN
  is_verified := (meta_verified = 'true' OR lower(signup_method) = 'google');

  INSERT INTO public.users (
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
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'description', ''),
    coalesce(new.raw_user_meta_data->>'logo', ''),
    signup_method,
    sub,
    is_verified
  );
  RETURN new;
END;
$$;

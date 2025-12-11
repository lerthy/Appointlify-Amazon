-- Update the handle_new_user function to include subdomain and other metadata fields
-- This ensures that when a new user signs up, their subdomain (and other profile info) 
-- is correctly copied from the auth metadata to the public.users table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    phone,
    description,
    logo,
    subdomain,
    role
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'description',
    new.raw_user_meta_data->>'logo',
    new.raw_user_meta_data->>'subdomain',
    COALESCE(new.raw_user_meta_data->>'role', 'business')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    description = EXCLUDED.description,
    logo = EXCLUDED.logo,
    subdomain = EXCLUDED.subdomain;
  
  RETURN new;
END;
$$;

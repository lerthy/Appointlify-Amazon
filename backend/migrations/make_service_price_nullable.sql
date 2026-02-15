  -- Allow price to be optional (null) for services
  ALTER TABLE public.services
    ALTER COLUMN price DROP NOT NULL;

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors when re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 1. Policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_user_id);

-- 2. Policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

-- 3. Policy to allow users to insert their own profile (for the fallback case)
CREATE POLICY "Users can insert own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

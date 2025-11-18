-- ============================================================================
-- FIXED MIGRATION: Switch from Custom Auth to Supabase Auth
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This version has the syntax errors fixed
-- ============================================================================

-- PART 1: Update Users Table to Reference Supabase Auth
-- ============================================================================

-- Add auth_user_id column to link to Supabase auth.users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- ============================================================================
-- PART 2: Enable Row Level Security for Users Table
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role can do everything" ON users;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow insert for authenticated users (for profile creation)
CREATE POLICY "Authenticated users can insert own data"
ON users
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow service role to bypass RLS (for backend operations)
CREATE POLICY "Service role can do everything"
ON users
FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 3: Appointment Confirmation Fields
-- ============================================================================

-- Create enum type for confirmation status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_confirmation_status') THEN
        CREATE TYPE appointment_confirmation_status AS ENUM ('pending', 'confirmed');
    END IF;
END$$;

-- Add appointment confirmation fields
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmation_status appointment_confirmation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
ADD COLUMN IF NOT EXISTS confirmation_token_expires TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token 
ON appointments(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_status 
ON appointments(confirmation_status);

-- ============================================================================
-- PART 4: Auto-confirm existing appointments (backward compatibility)
-- ============================================================================

-- Mark all existing appointments as confirmed
UPDATE appointments 
SET confirmation_status = 'confirmed' 
WHERE confirmation_status = 'pending' OR confirmation_status IS NULL;

-- ============================================================================
-- PART 5: Helper Function
-- ============================================================================

-- Function to get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(
  p_auth_user_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = p_auth_user_id;
  
  -- If not found, create new profile
  IF v_user_id IS NULL THEN
    INSERT INTO users (auth_user_id, email, name, created_at)
    VALUES (p_auth_user_id, p_email, COALESCE(p_name, split_part(p_email, '@', 1)), NOW())
    RETURNING id INTO v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- ============================================================================
-- DONE! Migration Complete
-- ============================================================================

-- Verification queries (run these to check if migration worked):
-- SELECT auth_user_id, email, name FROM users LIMIT 5;
-- SELECT confirmation_status, COUNT(*) FROM appointments GROUP BY confirmation_status;
-- SELECT COUNT(*) FROM users WHERE auth_user_id IS NOT NULL;


-- ============================================================================
-- MIGRATION: Switch from Custom Auth to Supabase Auth
-- ============================================================================
-- This migration updates the schema to use Supabase's built-in authentication
-- Run this in Supabase SQL Editor
-- ============================================================================

-- PART 1: Update Users Table to Reference Supabase Auth
-- ============================================================================

-- Add auth_user_id column to link to Supabase auth.users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Remove custom password field (Supabase Auth handles this)
-- We'll keep it for now for backward compatibility, but new users won't use it
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Remove custom email verification fields (Supabase Auth handles this)
-- ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_verification_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_verification_token_expires;

-- ============================================================================
-- PART 2: Keep Appointment Confirmation (This is separate from auth)
-- ============================================================================

-- Appointment confirmation fields should remain as-is
-- These are already added from the previous migration

-- ============================================================================
-- PART 3: Enable Row Level Security for Users Table
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert own data" ON users;

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

-- ============================================================================
-- PART 4: Helper Function to Get User Profile
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
-- PART 5: Appointment Confirmation (Keep as-is)
-- ============================================================================

-- Ensure appointment confirmation fields exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmation_status appointment_confirmation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
ADD COLUMN IF NOT EXISTS confirmation_token_expires TIMESTAMP WITH TIME ZONE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token 
ON appointments(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_status 
ON appointments(confirmation_status);

-- ============================================================================
-- PART 6: Auto-confirm existing appointments (OPTIONAL)
-- ============================================================================

-- Uncomment this to automatically confirm all existing appointments
UPDATE appointments 
SET confirmation_status = 'confirmed' 
WHERE confirmation_status = 'pending' OR confirmation_status IS NULL;

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verification queries:
-- SELECT auth_user_id, email, name FROM users LIMIT 5;
-- SELECT confirmation_status, COUNT(*) FROM appointments GROUP BY confirmation_status;


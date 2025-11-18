-- ============================================================================
-- QUICK FIX: Run this SQL in your Supabase Dashboard
-- ============================================================================
-- Go to: Supabase Dashboard → SQL Editor → New Query
-- Copy and paste this entire file, then click "Run"
-- ============================================================================

-- PART 1: Business Email Verification
-- ============================================================================

-- Add email verification fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(email_verification_token) 
WHERE email_verification_token IS NOT NULL;

-- ============================================================================
-- PART 2: Appointment Confirmation
-- ============================================================================

-- Create enum for appointment confirmation status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_confirmation_status') THEN
        CREATE TYPE appointment_confirmation_status AS ENUM ('pending', 'confirmed');
    END IF;
END$$;

-- Add confirmation fields to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmation_status appointment_confirmation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmation_token TEXT,
ADD COLUMN IF NOT EXISTS confirmation_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token 
ON appointments(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

-- Create index for filtering by confirmation status
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_status 
ON appointments(confirmation_status);

-- ============================================================================
-- PART 3: Update existing data (CHOOSE ONE OPTION)
-- ============================================================================

-- OPTION A: Auto-verify existing data (RECOMMENDED for backward compatibility)
-- Uncomment these lines to automatically verify existing businesses and confirm existing appointments:

UPDATE users SET email_verified = TRUE WHERE email_verified IS FALSE;
UPDATE appointments SET confirmation_status = 'confirmed' WHERE confirmation_status = 'pending';

-- OPTION B: Require verification for existing data (strict security)
-- Leave the lines above commented to require existing businesses to verify their email
-- and existing appointments to be confirmed by customers.

-- ============================================================================
-- PART 4: Cleanup expired tokens function
-- ============================================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clear expired email verification tokens
    UPDATE users
    SET email_verification_token = NULL,
        email_verification_token_expires = NULL
    WHERE email_verification_token_expires < NOW()
      AND email_verification_token IS NOT NULL;
    
    -- Clear expired appointment confirmation tokens
    UPDATE appointments
    SET confirmation_token = NULL,
        confirmation_token_expires = NULL
    WHERE confirmation_token_expires < NOW()
      AND confirmation_token IS NOT NULL;
END;
$$;

-- ============================================================================
-- DONE! Your database is now ready for email verification and appointment confirmation
-- ============================================================================

-- To verify the migration worked, run these queries:
-- SELECT COUNT(*) FROM users WHERE email_verified IS NOT NULL;
-- SELECT COUNT(*) FROM appointments WHERE confirmation_status IS NOT NULL;


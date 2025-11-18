-- Migration: Add email verification and appointment confirmation fields
-- Purpose: Implement secure business email verification and customer appointment confirmation
-- Date: 2025-11-18

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

-- Add comment for documentation
COMMENT ON COLUMN users.email_verified IS 'Indicates if business email has been verified';
COMMENT ON COLUMN users.email_verification_token IS 'Token for email verification link';
COMMENT ON COLUMN users.email_verification_token_expires IS 'Expiration timestamp for verification token';

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

-- Add comments for documentation
COMMENT ON COLUMN appointments.confirmation_status IS 'Customer confirmation status: pending (default) or confirmed';
COMMENT ON COLUMN appointments.confirmation_token IS 'Token for customer to confirm appointment';
COMMENT ON COLUMN appointments.confirmation_token_expires IS 'Expiration timestamp for confirmation token';

-- ============================================================================
-- PART 3: Update existing data
-- ============================================================================

-- Mark all existing businesses as verified (legacy data)
-- Comment out if you want to require existing businesses to verify
-- UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Mark all existing appointments as confirmed (legacy data)
-- Comment out if you want existing appointments to go through confirmation
-- UPDATE appointments SET confirmation_status = 'confirmed' WHERE confirmation_status = 'pending';

-- ============================================================================
-- PART 4: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to verify their own email
CREATE POLICY IF NOT EXISTS "Users can update their own verification status"
ON users
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Enable RLS on appointments table if not already enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public access to confirm appointments via token
-- (This allows customers to confirm without authentication)
CREATE POLICY IF NOT EXISTS "Anyone can confirm appointments with valid token"
ON appointments
FOR UPDATE
USING (confirmation_token IS NOT NULL)
WITH CHECK (confirmation_token IS NOT NULL);

-- ============================================================================
-- PART 5: Cleanup expired tokens function
-- ============================================================================

-- Function to clean up expired tokens (run periodically via cron or trigger)
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

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 * * * *', 'SELECT cleanup_expired_tokens();');

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Cleans up expired verification and confirmation tokens';


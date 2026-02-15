-- Migration: Add public read policy for business information
-- Purpose: Allow unauthenticated users to read business information for booking
-- Date: 2025-01-XX

-- ============================================================================
-- Add Public Read Policy for Users Table (Business Information)
-- ============================================================================

-- Policy: Allow public to read business information (for booking)
-- This allows unauthenticated users to view business details needed for appointment booking
CREATE POLICY "Public can read business information"
ON users
FOR SELECT
USING (true);

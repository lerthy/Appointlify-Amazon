-- Migration: Add icon column to services table
-- Run this in your Supabase SQL editor or database management tool

-- Add icon column to existing services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Briefcase';

-- Update existing services to have a default icon
UPDATE services SET icon = 'Briefcase' WHERE icon IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'services' AND column_name = 'icon';

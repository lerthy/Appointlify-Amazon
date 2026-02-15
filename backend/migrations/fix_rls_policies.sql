-- Migration: Fix RLS policies for user registration and data access
-- Purpose: Allow new user registration and proper data access with RLS
-- Date: 2025-11-18

-- ============================================================================
-- PART 1: Users Table RLS Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own verification status" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Policy: Allow authenticated users to insert their own user record during signup
CREATE POLICY "Users can insert their own profile"
ON users
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow authenticated users to read their own data
CREATE POLICY "Users can read their own profile"
ON users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Policy: Allow authenticated users to update their own data
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Policy: Allow service role to manage all user records (for backend operations)
CREATE POLICY "Service role can manage all users"
ON users
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 2: Business Settings Table RLS Policies
-- ============================================================================

-- Enable RLS on business_settings if not already enabled
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can insert their own business settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update their own business settings" ON business_settings;
DROP POLICY IF EXISTS "Service role can manage all business settings" ON business_settings;

-- Policy: Allow users to read their own business settings
CREATE POLICY "Users can read their own business settings"
ON business_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = business_settings.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow users to insert their own business settings
CREATE POLICY "Users can insert their own business settings"
ON business_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = business_settings.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow users to update their own business settings
CREATE POLICY "Users can update their own business settings"
ON business_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = business_settings.business_id
    AND users.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = business_settings.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow service role to manage all business settings
CREATE POLICY "Service role can manage all business settings"
ON business_settings
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 3: Services Table RLS Policies
-- ============================================================================

-- Enable RLS on services if not already enabled
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own services" ON services;
DROP POLICY IF EXISTS "Public can read services" ON services;
DROP POLICY IF EXISTS "Service role can manage all services" ON services;

-- Policy: Allow users to manage their own services
CREATE POLICY "Users can manage their own services"
ON services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = services.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow public to read services (for booking)
CREATE POLICY "Public can read services"
ON services
FOR SELECT
USING (true);

-- Policy: Allow service role to manage all services
CREATE POLICY "Service role can manage all services"
ON services
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 4: Employees Table RLS Policies
-- ============================================================================

-- Enable RLS on employees if not already enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own employees" ON employees;
DROP POLICY IF EXISTS "Public can read employees" ON employees;
DROP POLICY IF EXISTS "Service role can manage all employees" ON employees;

-- Policy: Allow users to manage their own employees
CREATE POLICY "Users can manage their own employees"
ON employees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = employees.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow public to read employees (for booking)
CREATE POLICY "Public can read employees"
ON employees
FOR SELECT
USING (true);

-- Policy: Allow service role to manage all employees
CREATE POLICY "Service role can manage all employees"
ON employees
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 5: Customers Table RLS Policies
-- ============================================================================

-- Enable RLS on customers if not already enabled
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Public can create customers" ON customers;
DROP POLICY IF EXISTS "Public can read customers" ON customers;
DROP POLICY IF EXISTS "Service role can manage all customers" ON customers;

-- Policy: Allow public to create customers (for booking)
CREATE POLICY "Public can create customers"
ON customers
FOR INSERT
WITH CHECK (true);

-- Policy: Allow public to read customers (needed for appointment booking)
CREATE POLICY "Public can read customers"
ON customers
FOR SELECT
USING (true);

-- Policy: Allow service role to manage all customers
CREATE POLICY "Service role can manage all customers"
ON customers
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 6: Appointments Table RLS Policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can confirm appointments with valid token" ON appointments;
DROP POLICY IF EXISTS "Users can manage their own appointments" ON appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON appointments;
DROP POLICY IF EXISTS "Public can confirm appointments with token" ON appointments;
DROP POLICY IF EXISTS "Service role can manage all appointments" ON appointments;

-- Policy: Allow users to manage their own appointments
CREATE POLICY "Users can manage their own appointments"
ON appointments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = appointments.business_id
    AND users.auth_user_id = auth.uid()
  )
);

-- Policy: Allow public to create appointments (for booking)
CREATE POLICY "Public can create appointments"
ON appointments
FOR INSERT
WITH CHECK (true);

-- Policy: Allow public to update appointments with valid confirmation token
CREATE POLICY "Public can confirm appointments with token"
ON appointments
FOR UPDATE
USING (confirmation_token IS NOT NULL)
WITH CHECK (confirmation_token IS NOT NULL);

-- Policy: Allow service role to manage all appointments
CREATE POLICY "Service role can manage all appointments"
ON appointments
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- ============================================================================
-- PART 7: Reviews Table RLS Policies (if exists)
-- ============================================================================

-- Enable RLS on reviews if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        EXECUTE 'ALTER TABLE reviews ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "Public can read reviews" ON reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Public can create reviews" ON reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage their business reviews" ON reviews';
        EXECUTE 'DROP POLICY IF EXISTS "Service role can manage all reviews" ON reviews';
        
        -- Allow public to read reviews
        EXECUTE 'CREATE POLICY "Public can read reviews" ON reviews FOR SELECT USING (true)';
        
        -- Allow public to create reviews
        EXECUTE 'CREATE POLICY "Public can create reviews" ON reviews FOR INSERT WITH CHECK (true)';
        
        -- Allow users to manage reviews for their business
        EXECUTE 'CREATE POLICY "Users can manage their business reviews" ON reviews FOR ALL USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = reviews.business_id
            AND users.auth_user_id = auth.uid()
          )
        )';
        
        -- Allow service role
        EXECUTE 'CREATE POLICY "Service role can manage all reviews" ON reviews FOR ALL USING (current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role'')';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'business_settings', 'services', 'employees', 'customers', 'appointments', 'reviews')
ORDER BY tablename;

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


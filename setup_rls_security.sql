-- =====================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) SETUP
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow public registration (insert)
CREATE POLICY "users_insert_public" ON users
  FOR INSERT WITH CHECK (true);

-- Service role can read all users (for business listings)
CREATE POLICY "users_service_role_all" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- CUSTOMERS TABLE POLICIES
-- =====================================================

-- Customers can view their own records
CREATE POLICY "customers_select_own" ON customers
  FOR SELECT USING (auth.email() = email);

-- Allow anonymous inserts for booking
CREATE POLICY "customers_insert_anonymous" ON customers
  FOR INSERT WITH CHECK (true);

-- Business owners can view customers for their appointments
CREATE POLICY "customers_business_access" ON customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.customer_id = customers.id
      AND s.business_id = auth.uid()
    )
  );

-- Service role can access all customers
CREATE POLICY "customers_service_role_all" ON customers
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- EMPLOYEES TABLE POLICIES
-- =====================================================

-- Business owners can manage their employees
CREATE POLICY "employees_business_owner" ON employees
  FOR ALL USING (auth.uid() = business_id);

-- Employees can view their own record
CREATE POLICY "employees_select_own" ON employees
  FOR SELECT USING (auth.email() = email);

-- Service role can access all employees
CREATE POLICY "employees_service_role_all" ON employees
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- SERVICES TABLE POLICIES
-- =====================================================

-- Anyone can view services (for public booking)
CREATE POLICY "services_select_public" ON services
  FOR SELECT USING (true);

-- Business owners can manage their services
CREATE POLICY "services_business_owner" ON services
  FOR ALL USING (auth.uid() = business_id);

-- Service role can access all services
CREATE POLICY "services_service_role_all" ON services
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- APPOINTMENTS TABLE POLICIES
-- =====================================================

-- Customers can view their own appointments
CREATE POLICY "appointments_customer_own" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = appointments.customer_id
      AND c.email = auth.email()
    )
  );

-- Business owners can view appointments for their services
CREATE POLICY "appointments_business_owner" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = appointments.service_id
      AND s.business_id = auth.uid()
    )
  );

-- Allow anonymous inserts for booking
CREATE POLICY "appointments_insert_anonymous" ON appointments
  FOR INSERT WITH CHECK (true);

-- Service role can access all appointments
CREATE POLICY "appointments_service_role_all" ON appointments
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- BUSINESS_SETTINGS TABLE POLICIES
-- =====================================================

-- Business owners can manage their settings
CREATE POLICY "business_settings_owner" ON business_settings
  FOR ALL USING (auth.uid() = business_id);

-- Service role can access all business settings
CREATE POLICY "business_settings_service_role_all" ON business_settings
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- PASSWORD_RESET_TOKENS TABLE POLICIES
-- =====================================================

-- Only service role can manage password reset tokens
CREATE POLICY "password_reset_tokens_service_role_only" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- KNOWLEDGE TABLE POLICIES (Already has basic RLS)
-- =====================================================

-- Update knowledge table policy for better security
DROP POLICY IF EXISTS "read_knowledge" ON knowledge;

-- Anyone can read knowledge (for chatbot)
CREATE POLICY "knowledge_select_public" ON knowledge
  FOR SELECT USING (true);

-- Only service role can modify knowledge
CREATE POLICY "knowledge_service_role_modify" ON knowledge
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "knowledge_service_role_update" ON knowledge
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "knowledge_service_role_delete" ON knowledge
  FOR DELETE USING (auth.role() = 'service_role');

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant select access to authenticated users for public data
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON services TO authenticated;
GRANT SELECT ON knowledge TO authenticated;

-- Grant necessary permissions to anon for booking
GRANT SELECT ON users TO anon;
GRANT SELECT ON services TO anon;
GRANT SELECT ON knowledge TO anon;
GRANT INSERT ON customers TO anon;
GRANT INSERT ON appointments TO anon;

-- Service role maintains full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to get current user's business ID
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a business
CREATE OR REPLACE FUNCTION user_owns_business(business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for common RLS queries
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =====================================================
-- AUDIT LOGGING (Optional)
-- =====================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "audit_log_service_role_only" ON audit_log
  FOR ALL USING (auth.role() = 'service_role');

GRANT ALL ON audit_log TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify RLS is working:
/*
-- Check RLS status
SELECT schemaname, tablename, rowsecurity, hasalways
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Check policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- =====================================================
-- CLEANUP (if needed)
-- =====================================================

-- Uncomment these lines if you need to remove all policies and start over:
/*
-- Remove all policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge DISABLE ROW LEVEL SECURITY;
*/

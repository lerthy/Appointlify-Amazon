-- Database Setup Script for Appointment Management System
-- This script creates all the necessary tables for the new database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables (if they exist)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS employee_availability CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table (business owners and general users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers table (appointment bookings)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employees table (service providers)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Business Settings table (business configuration)
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    working_hours JSONB DEFAULT '[]',
    blocked_dates JSONB DEFAULT '[]',
    breaks JSONB DEFAULT '[]',
    appointment_duration INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Services table (services offered by businesses)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in minutes
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Employee Availability table (individual employee schedules)
CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    working_hours JSONB DEFAULT '[]',
    blocked_dates JSONB DEFAULT '[]',
    breaks JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Appointments table (booking records)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_employee_id ON employee_availability(employee_id);

-- Sample data for testing (optional)
-- Insert a sample business user
INSERT INTO users (id, name, email, password_hash, description) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Sample Business',
    'business@example.com',
    'password123',
    'A sample business for testing'
);

-- Insert sample business settings
INSERT INTO business_settings (business_id, name, working_hours, appointment_duration)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Sample Business',
    '[
        {"day": "Monday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Tuesday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Wednesday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Thursday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Friday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Saturday", "open": "10:00", "close": "15:00", "isClosed": false},
        {"day": "Sunday", "open": "00:00", "close": "00:00", "isClosed": true}
    ]',
    30
);

-- Insert sample employee
INSERT INTO employees (business_id, name, email, phone, role)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'John Doe',
    'john@example.com',
    '+1234567890',
    'Stylist'
);

-- Insert sample employee availability
INSERT INTO employee_availability (employee_id, working_hours)
VALUES (
    (SELECT id FROM employees WHERE email = 'john@example.com' LIMIT 1),
    '[
        {"day": "Monday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Tuesday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Wednesday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Thursday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Friday", "open": "09:00", "close": "17:00", "isClosed": false},
        {"day": "Saturday", "open": "10:00", "close": "15:00", "isClosed": false},
        {"day": "Sunday", "open": "00:00", "close": "00:00", "isClosed": true}
    ]'
);

-- Insert sample service
INSERT INTO services (business_id, name, description, duration, price)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Haircut',
    'Professional haircut service',
    30,
    25.00
);

-- Insert sample customer
INSERT INTO customers (name, email, phone)
VALUES (
    'Jane Smith',
    'jane@example.com',
    '+1234567891'
);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user; -- Database schema
-- Database schema
-- Database schema
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

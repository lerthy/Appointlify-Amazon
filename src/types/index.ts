// User table - for business owners and general users
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  description?: string;
  logo?: string;
  created_at: string;
}

// Customer table - for appointment bookings
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

// Employee table - for service providers
export interface Employee {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  image_url?: string;
  created_at: string;
}

// Business Settings table - for business configuration
export interface BusinessSettings {
  id: string;
  business_id: string;
  name: string;
  working_hours: any; // jsonb - flexible working hours data
  blocked_dates: any; // jsonb - dates when business is unavailable
  breaks: any; // jsonb - break times
  appointment_duration: number;
  created_at: string;
  updated_at: string;
}

// Service table - for services offered by businesses
export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  created_at: string;
}

// Employee Availability table - for individual employee schedules
export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  working_hours: any; // jsonb
  blocked_dates: any; // jsonb
  breaks: any; // jsonb
  created_at: string;
}

// Appointment table - for booking records
export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  business_id: string;
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  date: string; // ISO string
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  reminder_sent: boolean;
  notes?: string;
  created_at: string;
}

// Legacy interfaces for backward compatibility
export interface Analytics {
  averageWaitTime: number;
  customersServed: number;
  customersWaiting: number;
  peakHours: { hour: number; count: number }[];
}

// Extended appointment with related data
export interface AppointmentWithDetails extends Appointment {
  customer?: Customer;
  service?: Service;
  employee?: Employee;
  business?: BusinessSettings;
}
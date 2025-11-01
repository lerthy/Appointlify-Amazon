import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Appointment, 
  Service, 
  BusinessSettings,
  Analytics,
  Customer,
  Employee,
  Review
} from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';

interface AppContextType {
  appointments: Appointment[];
  customers: Customer[];
  employees: Employee[];
  services: Service[];
  reviews: Review[];
  businessSettings: BusinessSettings | null;
  analytics: Analytics;
  currentView: 'customer' | 'business';
  businessId: string | null;
  
  // Appointment functions
  addAppointment: (appointment: {
    customer_id: string;
    service_id: string;
    business_id: string;
    employee_id: string;
    name: string;
    phone: string;
    email: string;
    notes?: string;
    date: Date;
    duration: number;
  }) => Promise<string>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  getAppointmentById: (id: string) => Appointment | undefined;
  refreshAppointments: () => Promise<void>;
  
  // Customer functions
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Promise<string>;
  getCustomerById: (id: string) => Customer | undefined;
  
  // Service functions
  addService: (service: Omit<Service, 'id' | 'created_at'>) => Promise<string>;
  updateService: (id: string, service: Partial<Omit<Service, 'id' | 'created_at'>>) => Promise<void>;
  getServiceById: (id: string) => Service | undefined;
  deleteService: (id: string) => Promise<void>;
  
  // Employee functions
  addEmployee: (employee: Omit<Employee, 'id' | 'created_at'>) => Promise<string>;
  updateEmployee: (id: string, employee: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Business settings functions
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
  
  // Review functions
  addReview: (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  getReviewsByBusinessId: (businessId: string) => Review[];
  getTopReviews: (limit?: number) => Review[];
  refreshReviews: () => Promise<void>;
  
  // UI functions
  setCurrentView: (view: 'customer' | 'business') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode, businessIdOverride?: string }> = ({ children, businessIdOverride }) => {
  const { user } = useAuth();
  const [actualBusinessId, setActualBusinessId] = useState<string | null>(null);
  const businessId = businessIdOverride || actualBusinessId;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    averageWaitTime: 0,
    customersServed: 0,
    customersWaiting: 0,
    peakHours: []
  });
  const [currentView, setCurrentView] = useState<'customer' | 'business'>('customer');
  const [skipBackend, setSkipBackend] = useState<boolean>(false);

  // Fetch actual business ID from users table based on auth user
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(user.email)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json?.user?.id) setActualBusinessId(json.user.id);
      } catch (_) {}
    };
    fetchBusinessId();
  }, [user?.email]);

  // Fetch business settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      if (!businessId) return;
      try {
        const res = await fetch(`/api/business/${businessId}/settings`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.settings;
        if (data) setBusinessSettings(data);
      } catch (_) {}
    };
    fetchSettings();
  }, [businessId]);

  // Fetch appointments from backend
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!businessId) return;
      try {
        const res = await fetch(`/api/business/${businessId}/appointments`);
        if (!res.ok) return;
        const json = await res.json();
        setAppointments(json?.appointments || []);
      } catch (_) {}
    };
    fetchAppointments();
  }, [businessId]);

  // Fetch customers from backend
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers');
        if (!res.ok) return;
        const json = await res.json();
        setCustomers(json?.customers || []);
      } catch (_) {}
    };
    fetchCustomers();
  }, [businessId]);

  // Fetch employees (backend first, then Supabase fallback; skip backend after failure)
  useEffect(() => {
    const fetchEmployees = async () => {
      const effectiveBusinessId = businessId || user?.id || null;
      if (!effectiveBusinessId) return;
      if (!skipBackend) {
        try {
          const res = await fetch(`/api/business/${effectiveBusinessId}/employees`);
          if (res.ok) {
            const json = await res.json();
            setEmployees(json?.employees || []);
            return;
          }
          // Mark backend as unavailable to avoid repeated 503s
          setSkipBackend(true);
        } catch (_) {
          setSkipBackend(true);
        }
      }

      // Fallback: fetch directly from Supabase if backend route is unavailable
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('business_id', effectiveBusinessId)
          .order('created_at', { ascending: false });
        if (!error) {
          setEmployees(data || []);
        }
      } catch (_) {}
    };
    fetchEmployees();
  }, [businessId, user?.id, skipBackend]);

  // Fetch services from backend
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;
      try {
        const res = await fetch(`/api/business/${businessId}/services`);
        if (!res.ok) return;
        const json = await res.json();
        setServices(json?.services || []);
      } catch (_) {}
    };
    fetchServices();
  }, [businessId]);

  // Fetch reviews from backend
  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews?approved=true');
      if (!res.ok) return;
      const json = await res.json();
      setReviews(json?.reviews || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Update analytics when appointments change
  useEffect(() => {
    updateAnalytics();
  }, [appointments]);

  const updateAnalytics = () => {
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const scheduledAppointments = appointments.filter(a => a.status === 'scheduled');
    
    // Calculate peak hours
    const hourCounts = Array(24).fill(0);
    appointments.forEach(appointment => {
      const hour = new Date(appointment.date).getHours();
      hourCounts[hour]++;
    });
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setAnalytics({
      averageWaitTime: 0, // Not applicable for appointments
      customersServed: completedAppointments.length,
      customersWaiting: scheduledAppointments.length,
      peakHours
    });
  };

  const addAppointment = async (appointment: {
    customer_id: string;
    service_id: string;
    business_id: string;
    employee_id: string;
    name: string;
    phone: string;
    email: string;
    notes?: string;
    date: Date;
    duration: number;
  }): Promise<string> => {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: appointment.business_id,
        service_id: appointment.service_id,
        employee_id: appointment.employee_id,
        name: appointment.name,
        phone: appointment.phone,
        email: appointment.email,
        notes: appointment.notes || null,
        date: appointment.date.toISOString(),
        duration: appointment.duration,
      }),
    });
    if (!res.ok) throw new Error('Failed to create appointment');
    const json = await res.json();
    await refreshAppointments();
    return json?.appointmentId;
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    await refreshAppointments();
  };

  // Add refresh function for appointments
  const refreshAppointments = async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/business/${businessId}/appointments`);
      if (!res.ok) return;
      const json = await res.json();
      setAppointments(json?.appointments || []);
    } catch (err) {
      console.error('Error refreshing appointments:', err);
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<string> => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error('Failed to create customer');
    const json = await res.json();
    if (json?.customer) setCustomers(prev => [json.customer, ...prev]);
    return json?.customer?.id;
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at'>): Promise<string> => {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!res.ok) throw new Error('Failed to create service');
    const json = await res.json();
    if (json?.service) setServices(prev => [json.service, ...prev]);
    return json?.service?.id;
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'created_at'>): Promise<string> => {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    if (!res.ok) throw new Error('Failed to create employee');
    const json = await res.json();
    if (json?.employee) setEmployees(prev => [json.employee, ...prev]);
    return json?.employee?.id;
  };

  const updateBusinessSettings = async (settings: Partial<BusinessSettings>) => {
    if (!businessId) return;
    const res = await fetch(`/api/business/${businessId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json?.settings) setBusinessSettings(json.settings);
  };

  const getAppointmentById = (id: string) => {
    return appointments.find(appointment => appointment.id === id);
  };

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  const getServiceById = (id: string) => {
    return services.find(service => service.id === id);
  };

  const getEmployeeById = (id: string) => {
    return employees.find(employee => employee.id === id);
  };

  const deleteService = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete service');
    setServices(prev => prev.filter(service => service.id !== id));
  };

  const updateService = async (id: string, service: Partial<Omit<Service, 'id' | 'created_at'>>) => {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (!res.ok) throw new Error('Failed to update service');
    const json = await res.json();
    if (json?.service) setServices(prev => prev.map(svc => svc.id === id ? json.service : svc));
  };

  const deleteEmployee = async (id: string) => {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete employee');
    setEmployees(prev => prev.filter(employee => employee.id !== id));
  };

  const updateEmployee = async (id: string, employee: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    if (!res.ok) throw new Error('Failed to update employee');
    const json = await res.json();
    if (json?.employee) setEmployees(prev => prev.map(emp => emp.id === id ? json.employee : emp));
  };

  // Review functions
  const addReview = async (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!res.ok) throw new Error('Failed to create review');
    const json = await res.json();
    if (json?.review) setReviews(prev => [json.review, ...prev]);
    return json?.review?.id;
  };

  const getReviewsByBusinessId = (businessId: string): Review[] => {
    return reviews.filter(review => review.business_id === businessId);
  };

  const getTopReviews = (limit: number = 3): Review[] => {
    return reviews
      .filter(review => review.is_approved)
      .sort((a, b) => {
        // Sort by rating (descending) and then by date (newest first)
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, limit);
  };

  const refreshReviews = async (): Promise<void> => {
    await fetchReviews();
  };

  return (
    <AppContext.Provider value={{
      appointments,
      customers,
      employees,
      services,
      reviews,
      businessSettings,
      analytics,
      currentView,
      businessId,
      addAppointment,
      updateAppointmentStatus,
      refreshAppointments,
      addCustomer,
      addService,
      updateService,
      deleteService,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      updateBusinessSettings,
      addReview,
      getReviewsByBusinessId,
      getTopReviews,
      refreshReviews,
      getAppointmentById,
      getCustomerById,
      getServiceById,
      getEmployeeById,
      setCurrentView
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { authenticatedFetch } from '../utils/apiClient';

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

export const AppProvider: React.FC<{ 
  children: React.ReactNode, 
  businessIdOverride?: string,
  enableRealtime?: boolean 
}> = ({ children, businessIdOverride, enableRealtime = false }) => {
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

  // Fetch actual business ID from backend; fall back to local user.id if unavailable
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!user?.email && user?.id) {
        setActualBusinessId(user.id);
        return;
      }
      if (!user?.email) return;
      try {
        const json = await authenticatedFetch(`/api/users/by-email?email=${encodeURIComponent(user.email)}`);
        if (json?.user?.id) {
          setActualBusinessId(json.user.id);
          return;
        }
      } catch (_) {}
      // Fallback: use auth user id for dev when backend DB is unavailable
      if (user?.id) setActualBusinessId(user.id);
    };
    fetchBusinessId();
  }, [user?.email, user?.id]);

  // Fetch business settings (DB route first, then Supabase fallback); stop retrying after DB is unavailable
  useEffect(() => {
    const fetchSettings = async () => {
      if (!businessId) return;
      
      const applySettings = (data: any) => {
        if (data) {
          setBusinessSettings(data);
        } else {
          // Verify default settings if backend returns null
          console.warn('[AppContext] No settings found, using defaults');
          setBusinessSettings({
            id: 'default',
            business_id: businessId,
            working_hours: [
              { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Saturday', open: '09:00', close: '17:00', isClosed: true },
              { day: 'Sunday', open: '09:00', close: '17:00', isClosed: true }
            ],
            blocked_dates: [],
            appointment_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as BusinessSettings);
        }
      };

      if (!skipBackend) {
        try {
          const json = await authenticatedFetch(`/api/business/${businessId}/settings`);
          applySettings(json?.settings);
          return;
        } catch (_) {
          setSkipBackend(true);
        }
      }

      // Fallback: direct Supabase read when backend DB routes are unavailable
      try {
        const { data, error } = await supabase
          .from('business_settings')
          .select('*')
          .eq('business_id', businessId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[AppContext] Error loading business_settings via Supabase fallback:', error);
          return;
        }

        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
        applySettings(row);
      } catch (err) {
        console.error('[AppContext] Exception in Supabase fallback for business_settings:', err);
      }
    };
    fetchSettings();
  }, [businessId, skipBackend]);

  // Fetch appointments (DB route first; on failure, mark skip and use Supabase fallback)
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!businessId) return;
      if (!skipBackend) {
        try {
          const json = await authenticatedFetch(`/api/business/${businessId}/appointments`);
          setAppointments(json?.appointments || []);
          return;
        } catch (_) {
          setSkipBackend(true);
        }
      }

      // Fallback: direct Supabase
      try {
        const { data } = await supabase
          .from('appointments')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: true });
        setAppointments((data as unknown as Appointment[]) || []);
      } catch (_) {}
    };
    fetchAppointments();
  }, [businessId, skipBackend]);

  // Real-time subscription for appointments (only when enabled)
  useEffect(() => {
    if (!businessId || !enableRealtime) return;
    
    // Subscribe to all changes in appointments table for this business
    const channel = supabase
      .channel(`appointments_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAppointment = payload.new as unknown as Appointment;
            
            setAppointments(prev => {
              // Check if appointment already exists to avoid duplicates
              if (prev.some(apt => apt.id === newAppointment.id)) {
                return prev;
              }
              // Add new appointment and sort by date
              return [...prev, newAppointment].sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAppointment = payload.new as unknown as Appointment;
            
            setAppointments(prev =>
              prev.map(apt =>
                apt.id === updatedAppointment.id ? updatedAppointment : apt
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            
            setAppointments(prev =>
              prev.filter(apt => apt.id !== deletedId)
            );
          }
        }
      )
      .subscribe(() => {
        // Subscription status handled internally
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, enableRealtime]);

  // Fetch customers from backend
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const json = await authenticatedFetch('/api/customers');
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

      // Helper to scope any employee list to the current business
      const setScopedEmployees = (list: Employee[]) => {
        const scoped = list.filter(e => e.business_id === effectiveBusinessId);
        const byEmail = new Map<string, Employee>();
        scoped.forEach(e => byEmail.set(e.email, e));
        setEmployees(Array.from(byEmail.values()));
      };

      if (!skipBackend) {
        try {
          const json = await authenticatedFetch(`/api/business/${effectiveBusinessId}/employees`);
          const list = (json?.employees || []) as Employee[];
          setScopedEmployees(list);
          return;
        } catch (_) {
          // Fallback to dev in-memory list when DB route is unavailable (e.g., 503)
          try {
            const devJson = await authenticatedFetch(`/api/employees?businessId=${encodeURIComponent(effectiveBusinessId)}`);
            const list = (devJson?.employees || []) as Employee[];
            setScopedEmployees(list);
            return;
          } catch {}
          // Mark backend as unavailable to avoid repeated 503s
          setSkipBackend(true);
        }
      } else {
        // When backend DB routes are unavailable, prefer dev in-memory endpoint first
        try {
          const devJson = await authenticatedFetch(`/api/employees?businessId=${encodeURIComponent(effectiveBusinessId)}`);
          const list = (devJson?.employees || []) as Employee[];
          setScopedEmployees(list);
          return;
        } catch {}
        // Secondary fallback: direct Supabase query if frontend is configured
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('business_id', effectiveBusinessId)
            .order('created_at', { ascending: false });
          if (!error) {
            const list = (data || []) as Employee[];
            setScopedEmployees(list);
          }
        } catch (_) {}
      }
    };
    fetchEmployees();
  }, [businessId, user?.id, skipBackend]);

  // Fetch services (DB route first; on failure, mark skip and use Supabase fallback)
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;
      if (!skipBackend) {
        try {
          const json = await authenticatedFetch(`/api/business/${businessId}/services`);
          setServices(json?.services || []);
          return;
        } catch (_) {
          setSkipBackend(true);
        }
      }

      // Fallback: direct Supabase
      try {
        const { data } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .order('name');
        setServices((data as unknown as Service[]) || []);
      } catch (_) {}
    };
    fetchServices();
  }, [businessId, skipBackend]);

  // Fetch reviews from backend
  const fetchReviews = async () => {
    try {
      const json = await authenticatedFetch('/api/reviews?approved=true');
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
    // Generate confirmation token
    const confirmationToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 48); // 48 hour expiry

    const response = await fetch('/api/appointments', {
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
        confirmation_token: confirmationToken,
        confirmation_token_expires: tokenExpiry.toISOString()
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create appointment' }));
      throw new Error(errorData.error || 'Failed to create appointment');
    }
    
    const json = await response.json();
    
    // Note: Email sending is handled by AppointmentForm.tsx to avoid duplicates
    // The email is sent there with more context (service name, business details, etc.)
    
    await refreshAppointments();
    return json?.appointmentId;
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    try {
      await authenticatedFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      await refreshAppointments();
    } catch (error) {
      console.error('[updateAppointmentStatus] Exception:', error);
      throw error;
    }
  };

  // Add refresh function for appointments (memoized to prevent infinite loops)
  const refreshAppointments = useCallback(async () => {
    if (!businessId) return;
    try {
      const response = await fetch(`/api/business/${businessId}/appointments`);
      if (!response.ok) {
        // Silently fail if we can't refresh - this is okay for guest bookings
        return;
      }
      const json = await response.json();
      setAppointments(json?.appointments || []);
    } catch (err) {
      // Silently fail if we can't refresh - this is okay for guest bookings
      console.error('Error refreshing appointments:', err);
    }
  }, [businessId]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<string> => {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create customer' }));
      throw new Error(errorData.error || 'Failed to create customer');
    }
    const json = await response.json();
    if (json?.customer) setCustomers(prev => [json.customer, ...prev]);
    return json?.customer?.id;
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at'>): Promise<string> => {
    // Conform to backend DTO: only send allowed fields
    const payload: {
      business_id: string;
      name: string;
      description?: string;
      duration: number;
      price: number;
    } = {
      business_id: service.business_id,
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
    };
    const json = await authenticatedFetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (json?.service) setServices(prev => [json.service, ...prev]);
    return json?.service?.id;
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'created_at'>): Promise<string> => {
    // Enforce required backend DTO fields and avoid sending extra fields (e.g., image_url)
    const payload: {
      business_id: string;
      name: string;
      role: string;
      email: string;
      phone?: string;
    } = {
      business_id: employee.business_id,
      name: employee.name,
      role: employee.role,
      email: employee.email,
    };
    if (employee.phone) payload.phone = employee.phone;

    if (!payload.business_id) {
      throw new Error('Missing business_id for new employee');
    }

    const json = await authenticatedFetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (json?.employee) setEmployees(prev => [json.employee, ...prev]);
    return json?.employee?.id;
  };

  const updateBusinessSettings = async (settings: Partial<BusinessSettings>) => {
    if (!businessId) return;
    console.log('[updateBusinessSettings] Sending settings payload:', {
      businessId,
      settings,
    });
    const json = await authenticatedFetch(`/api/business/${businessId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    
    if (json?.settings) setBusinessSettings(json.settings as BusinessSettings);
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
    await authenticatedFetch(`/api/services/${id}`, { method: 'DELETE' });
    setServices(prev => prev.filter(service => service.id !== id));
  };

  const updateService = async (id: string, service: Partial<Omit<Service, 'id' | 'created_at'>>) => {
    const json = await authenticatedFetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    if (json?.service) setServices(prev => prev.map(svc => svc.id === id ? json.service : svc));
  };

  const deleteEmployee = async (id: string) => {
    await authenticatedFetch(`/api/employees/${id}`, { method: 'DELETE' });
    setEmployees(prev => prev.filter(employee => employee.id !== id));
  };

  const updateEmployee = async (id: string, employee: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    const json = await authenticatedFetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    if (json?.employee) setEmployees(prev => prev.map(emp => emp.id === id ? json.employee : emp));
  };

  // Review functions
  const addReview = async (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const json = await authenticatedFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
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
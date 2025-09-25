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
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

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

  // Fetch actual business ID from users table based on auth user
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!user?.email) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (!error && data) {
        setActualBusinessId(data.id);
      }
    };
    
    fetchBusinessId();
  }, [user?.email]);

  // Fetch business settings from Supabase
  useEffect(() => {
    const fetchSettings = async () => {
      if (!businessId) return;
      
      try {
        const { data, error } = await supabase
          .from('business_settings')
          .select('*')
          .eq('business_id', businessId)
          .single();
        
        if (error) {
          // If no settings found, create default settings
          if (error.code === 'PGRST116' || error.message?.includes('No rows returned')) {
            console.log('No business settings found, creating default settings...');
            const defaultWorkingHours = [
              { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
              { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
              { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
            ];

            const { data: newSettings, error: createError } = await supabase
              .from('business_settings')
              .insert([{
                business_id: businessId,
                name: 'My Business',
                working_hours: defaultWorkingHours,
                blocked_dates: [],
                breaks: [],
                appointment_duration: 30
              }])
              .select()
              .single();

            if (createError) {
              console.error('Failed to create default business settings:', createError);
              return;
            }

            if (newSettings) {
              setBusinessSettings(newSettings);
            }
          } else {
            console.error('Error fetching business settings:', error);
          }
          return;
        }
        
        if (data) {
          // Parse JSONB fields if they're strings
          if (typeof data.working_hours === 'string') {
            try {
              data.working_hours = JSON.parse(data.working_hours);
            } catch (e) {
              data.working_hours = [];
            }
          }
          if (typeof data.blocked_dates === 'string') {
            try {
              data.blocked_dates = JSON.parse(data.blocked_dates);
            } catch (e) {
              data.blocked_dates = [];
            }
          }
          if (typeof data.breaks === 'string') {
            try {
              data.breaks = JSON.parse(data.breaks);
            } catch (e) {
              data.breaks = [];
            }
          }
          setBusinessSettings(data);
        }
      } catch (err) {
        console.error('Unexpected error in fetchSettings:', err);
      }
    };
    fetchSettings();
  }, [businessId]);

  // Fetch appointments from Supabase
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: true });
      
      if (!error && data) {
        setAppointments(data);
      }
    };
    fetchAppointments();
  }, [businessId]);

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId) return;
      // Customers are global, but we can filter by business if needed
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setCustomers(data);
      }
    };
    fetchCustomers();
  }, [businessId]);

  // Fetch employees from Supabase
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, [businessId]);

  // Fetch services from Supabase
  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setServices(data);
      }
    };
    fetchServices();
  }, [businessId]);

  // Fetch reviews from Supabase
  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setReviews(data);
    }
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
    const newAppointment = {
      id: uuidv4(),
      customer_id: appointment.customer_id,
      service_id: appointment.service_id,
      business_id: appointment.business_id,
      employee_id: appointment.employee_id,
      name: appointment.name,
      phone: appointment.phone,
      email: appointment.email,
      date: appointment.date.toISOString(),
      duration: appointment.duration,
      status: 'scheduled' as const,
      reminder_sent: false,
      notes: appointment.notes || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert([newAppointment])
      .select()
      .single();

    if (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after appointment creation');
    }

    setAppointments(prev => [...prev, data]);
    return data.id;
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    
    if (!error) {
      setAppointments(prev => 
        prev.map(appointment => 
          appointment.id === id ? { ...appointment, status } : appointment
        )
      );
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<string> => {
    const newCustomer = {
      id: uuidv4(),
      ...customer,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after customer creation');
    }

    setCustomers(prev => [...prev, data]);
    return data.id;
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at'>): Promise<string> => {
    const newService = {
      id: uuidv4(),
      ...service,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('services')
      .insert([newService])
      .select()
      .single();

    if (error) {
      console.error('Error adding service:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after service creation');
    }

    setServices(prev => [...prev, data]);
    return data.id;
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'created_at'>): Promise<string> => {
    const newEmployee = {
      id: uuidv4(),
      ...employee,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('employees')
      .insert([newEmployee])
      .select()
      .single();

    if (error) {
      console.error('Error adding employee:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after employee creation');
    }

    setEmployees(prev => [...prev, data]);
    return data.id;
  };

  const updateBusinessSettings = async (settings: Partial<BusinessSettings>) => {
    if (!businessId) return;
    
    // Try to update first
    let { data, error } = await supabase
      .from('business_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .select()
      .single();

    // If no row was updated, insert a new one
    if ((!data || error) && (error?.code === 'PGRST116' || error?.message?.includes('No rows returned'))) {
      const { data: inserted, error: insertError } = await supabase
        .from('business_settings')
        .insert([{
          id: uuidv4(),
          business_id: businessId,
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error('Error creating business settings:', insertError);
        throw insertError;
      }
      
      if (inserted) setBusinessSettings(inserted);
    } else if (data) {
      setBusinessSettings(data);
    }
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
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
    
    setServices(prev => prev.filter(service => service.id !== id));
  };

  const updateService = async (id: string, service: Partial<Omit<Service, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('services')
      .update(service)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating service:', error);
      throw error;
    }
    
    if (data) {
      setServices(prev => prev.map(svc => svc.id === id ? data : svc));
    }
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
    
    setEmployees(prev => prev.filter(employee => employee.id !== id));
  };

  const updateEmployee = async (id: string, employee: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
    
    if (data) {
      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp));
    }
  };

  // Review functions
  const addReview = async (review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...review,
        is_approved: true, // Auto-approve for now
        is_featured: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding review:', error);
      throw error;
    }
    
    if (data) {
      setReviews(prev => [data, ...prev]);
      return data.id;
    }
    
    throw new Error('Failed to create review');
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
import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Clock, FileText, Users, Briefcase, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Loader from '../ui/Loader';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import { sendSMS } from '../../utils/smsService';
import { supabase } from '../../utils/supabaseClient';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import type { BusinessSettings } from '../../types';

interface AppointmentFormProps {
  businessId?: string;
  business?: { name?: string; logo?: string; business_address?: string } | null;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ businessId, business }) => {
  const { addAppointment, addCustomer, services, employees } = useApp();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);

  // Dynamically fetched booking settings - always fresh, works for public booking (no auth)
  const [bookingSettings, setBookingSettings] = useState<BusinessSettings | null>(null);
  const [loadingBookingSettings, setLoadingBookingSettings] = useState(true);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service_id: '',
    employee_id: '',
    date: '',
    time: '',
    notes: ''
  });

  // Fetch booking settings dynamically on mount - plain fetch (no auth) for public booking
  useEffect(() => {
    if (!businessId) {
      setBookingSettings(null);
      setLoadingBookingSettings(false);
      return;
    }
    setLoadingBookingSettings(true);
    const fetchBookingSettings = async () => {
      try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_URL = isLocalhost ? '' : (import.meta.env.VITE_API_URL || '');
        const apiPath = API_URL ? `${API_URL}/api/business/${businessId}/settings` : `/api/business/${businessId}/settings`;
        const res = await fetch(apiPath, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const json = await res.json();
        setBookingSettings(json?.settings ?? null);
      } catch (err) {
        console.error('Error fetching booking settings:', err);
        setBookingSettings(null);
      } finally {
        setLoadingBookingSettings(false);
      }
    };
    fetchBookingSettings();
  }, [businessId]);

  // Helper: parse a YYYY-MM-DD string into a local Date at midnight
  const parseLocalDate = (yyyyMmDd: string): Date => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  };

  // Get available services and employees for this business (must be before selectedEmployee)
  const businessServices = services.filter(service => service.business_id === businessId);
  const businessEmployees = employees.filter(employee => employee.business_id === businessId);

  // Effective working hours: selected employee's schedule when an employee is chosen, else business settings
  const selectedEmployee = businessId && formData.employee_id
    ? businessEmployees.find((e) => e.id === formData.employee_id)
    : undefined;
  const effectiveWorkingHours =
    formData.employee_id &&
    selectedEmployee?.working_hours &&
    Array.isArray(selectedEmployee.working_hours) &&
    selectedEmployee.working_hours.length > 0
      ? selectedEmployee.working_hours
      : (bookingSettings?.working_hours || []);

  // Get available dates (next 14 days, excluding closed days and blocked dates) - uses effective working hours
  const getInitialAvailableDates = (workingHours: Array<{ day: string; open?: string; close?: string; isClosed?: boolean }>) => {
    const dates = [];
    const today = new Date();
    const blockedDates = bookingSettings?.blocked_dates || [];

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayWorkingHours = workingHours.find((wh: any) => wh.day === dayOfWeek);

      if (dayWorkingHours && !dayWorkingHours.isClosed && !blockedDates.includes(dateString)) {
        if (i === 0) {
          const now = new Date();
          const [closeHour, closeMinute] = (dayWorkingHours.close || '00:00').split(':').map(Number);
          const closeTime = new Date(now);
          closeTime.setHours(closeHour, closeMinute, 0, 0);
          if (now >= closeTime) continue;
        }
        dates.push(date);
      }
    }
    return dates;
  };

  // Use duration from selected service or bookingSettings.appointment_duration
  const selectedService = businessServices.find(s => s.id === formData.service_id);
  let serviceDuration = selectedService?.duration || bookingSettings?.appointment_duration || 30;

  const getSlotsForDate = (
    date: Date,
    duration: number,
    bookings: any[],
    workingHours: Array<{ day: string; open?: string; close?: string; isClosed?: boolean }> = effectiveWorkingHours
  ): string[] => {
    const slots: string[] = [];
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayWorkingHours = workingHours.find((wh: any) => wh.day === dayOfWeek);

    if (!dayWorkingHours || dayWorkingHours.isClosed) return slots;

    const [openHour, openMinute] = (dayWorkingHours.open || '00:00').split(':').map(Number);
    const [closeHour, closeMinute] = (dayWorkingHours.close || '00:00').split(':').map(Number);
    
    const openTime = new Date(date);
    openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    
    let currentTime = new Date(openTime);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
    const currentTimeWithBuffer = new Date(now.getTime() + 5 * 60000);

    while (currentTime < closeTime) {
      if (isToday && currentTime < currentTimeWithBuffer) {
        currentTime.setMinutes(currentTime.getMinutes() + 30);
        continue;
      }
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);
      
      if (slotEndTime > closeTime) break;
      
      let hasOverlap = false;
      for (const appt of bookings) {
        const existingStart = new Date(appt.date);
        const existingEnd = new Date(existingStart.getTime() + (appt.duration || 30) * 60000);
        if (currentTime < existingEnd && slotEndTime > existingStart) {
          hasOverlap = true;
          break;
        }
      }
      if (!hasOverlap) slots.push(currentTime.toTimeString().slice(0, 5));
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
    return slots;
  };

  // Initialize dates and filter out "Today" if it's fully booked - uses effective working hours
  useEffect(() => {
    if (!bookingSettings) return;

    const initialDates = getInitialAvailableDates(effectiveWorkingHours);
    
    // If no specific service/employee selected, we can't accurately check capacity, so return initial
    if (!formData.service_id || !formData.employee_id) {
      setAvailableDates(initialDates);
      return;
    }

    const checkTodayAvailability = async () => {
      // Find today in the list
      const todayIndex = initialDates.findIndex(d => {
        const now = new Date();
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      });

      if (todayIndex === -1) {
        setAvailableDates(initialDates);
        return;
      }

      const todayDate = initialDates[todayIndex];
      // Use local date string YYYY-MM-DD
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      try {
        // Fetch booked slots for today
        const params = new URLSearchParams({ date: dateString, employeeId: formData.employee_id });
        const res = await fetch(`/api/business/${businessId}/appointmentsByDay?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch slots');
        
        const json = await res.json();
        const data = json?.appointments || [];
        const activeAppointments = data.filter((appt: any) => 
          ['scheduled', 'confirmed'].includes(appt.status)
        );

        const slots = getSlotsForDate(todayDate, serviceDuration, activeAppointments);
        
        if (slots.length === 0) {
          // Today is full, remove it
          const newDates = [...initialDates];
          newDates.splice(todayIndex, 1);
          setAvailableDates(newDates);
          
          // If the selected date was Today, clear it
          if (formData.date === dateString) {
             setFormData(prev => ({ ...prev, date: '' }));
          }
        } else {
          setAvailableDates(initialDates);
        }
      } catch (err) {
        console.error('Error checking today availability:', err);
        setAvailableDates(initialDates); // Fallback
      }
    };

    checkTodayAvailability();
  }, [bookingSettings, formData.service_id, formData.employee_id, businessId, effectiveWorkingHours]); // Re-run when service/employee or working hours change

  // Check if selected day is closed for today - uses effective working hours
  const isBusinessClosedToday = () => {
    if (!formData.date) return false;

    const selectedDate = parseLocalDate(formData.date);
    const now = new Date();
    const isToday =
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    if (!isToday) return false;

    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dayWorkingHours = effectiveWorkingHours.find((wh: any) => wh.day === dayOfWeek);

    if (!dayWorkingHours || dayWorkingHours.isClosed) return true;

    const [closeHour, closeMinute] = (dayWorkingHours.close || '00:00').split(':').map(Number);
    const closeTime = new Date(selectedDate);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    return now >= closeTime;
  };

  // Auto-populate email and name fields when user is logged in
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        ...(user.name && !prev.name ? { name: user.name } : {})
      }));
    }
  }, [user?.email, user?.name, user?.id]);


  // Initialize form date - UPDATED to use availableDates state
  useEffect(() => {
    if (businessServices.length > 0 && businessEmployees.length > 0 && availableDates.length > 0) {
      // Only set if not already set, or if current selection is invalid (not in list)
      // Actually, if filtering removes a date, we handle it in the checking effect.
      // Here just ensure we have an initial value if empty.
      if (!formData.date) {
        const firstDate = availableDates[0];
        const year = firstDate.getFullYear();
        const month = String(firstDate.getMonth() + 1).padStart(2, '0');
        const day = String(firstDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        setFormData(prev => ({ ...prev, date: dateString }));
      }
    }
  }, [businessServices.length, businessEmployees.length, availableDates]);

  // Clear selected date if it is no longer in available dates (e.g. after changing employee)
  useEffect(() => {
    if (!formData.date || availableDates.length === 0) return;
    const dateStr = formData.date;
    const isInAvailable = availableDates.some(
      (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dateStr
    );
    if (!isInAvailable) {
      const firstDate = availableDates[0];
      const y = firstDate.getFullYear();
      const m = String(firstDate.getMonth() + 1).padStart(2, '0');
      const d = String(firstDate.getDate()).padStart(2, '0');
      setFormData((prev) => ({ ...prev, date: `${y}-${m}-${d}` }));
    }
  }, [availableDates, formData.date]);

  // Fetch booked appointments when date or employee changes
  useEffect(() => {
    if (!formData.date || !formData.employee_id || !businessId) {
       setBookedAppointments([]);
       return;
    }

    const fetchAppointments = async () => {
      try {
        const params = new URLSearchParams({ 
           date: formData.date, 
           employeeId: formData.employee_id 
        });
        const res = await fetch(`/api/business/${businessId}/appointmentsByDay?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch slots');
        
        const json = await res.json();
        const data = json?.appointments || [];
        // Filter active appointments
        const activeAppointments = data.filter((appt: any) => 
          ['scheduled', 'confirmed'].includes(appt.status)
        );
        setBookedAppointments(activeAppointments);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setBookedAppointments([]);
      }
    };

    fetchAppointments();
  }, [formData.date, formData.employee_id, businessId]);

  // Generate available time slots for the selected date and employee - uses bookingSettings
  useEffect(() => {
    if (!formData.date || !bookingSettings || !formData.employee_id || loadingBookingSettings) {
      setAvailableTimeSlots([]);
      return;
    }

    try {
      const slots = getSlotsForDate(parseLocalDate(formData.date), serviceDuration, bookedAppointments);
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableTimeSlots([]);
    }
  }, [formData.date, bookingSettings, serviceDuration, bookedAppointments, formData.employee_id, loadingBookingSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    
    // If service changed, update duration
    if (name === 'service_id') {
      const newService = businessServices.find(s => s.id === value);
      if (newService) {
        serviceDuration = newService.duration;
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.service_id) {
      newErrors.service_id = 'Please select a service';
    }
    
    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    } else {
      const isInAvailable = availableDates.some(d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}` === formData.date;
      });
      if (!isInAvailable) {
        newErrors.date = 'Please select an available date';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Please select a time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('383')) {
      return '+383' + cleaned.slice(3);
    }
    if (cleaned.startsWith('044') || cleaned.startsWith('049')) {
      return '+383' + cleaned.slice(1);
    }
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    // Fallback: just add +
    return '+' + cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Create appointment date object
      const [hours, minutes] = formData.time.split(':').map(Number);
      const appointmentDate = parseLocalDate(formData.date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      appointmentDate.setSeconds(0, 0);

      // Check for overlapping appointments - only active ones
      const activeStatuses = ['scheduled', 'confirmed', 'completed'];
      const appointmentEnd = new Date(appointmentDate.getTime() + serviceDuration * 60000);
      
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, business_id, date, status, employee_id, duration')
        .eq('business_id', businessId)
        .eq('employee_id', formData.employee_id)
        .in('status', activeStatuses); // Only check active appointments

      if (checkError) throw checkError;

      // Check for time slot overlaps
      if (existingAppointments && existingAppointments.length > 0) {
        const hasOverlap = existingAppointments.some((appt: any) => {
          const existingStart = new Date(appt.date);
          const existingEnd = new Date(existingStart.getTime() + (appt.duration || 30) * 60000);
          
          // Check if appointments overlap
          // Overlap occurs if: new starts before existing ends AND new ends after existing starts
          return appointmentDate < existingEnd && appointmentEnd > existingStart;
        });
        
        if (hasOverlap) {
          setErrors(prev => ({ ...prev, form: 'This time slot is already booked. Please choose another time.' }));
          return;
        }
      }

      // Create or find customer
      // Create or find customer
      // addCustomer calls /api/customers which handles get-or-create safely
      const customerId = await addCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      // Add appointment
      const appointmentId = await addAppointment({
        customer_id: customerId,
        service_id: formData.service_id,
        business_id: businessId || '',
        employee_id: formData.employee_id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        date: appointmentDate,
        duration: serviceDuration
      });

      // Confirmation email is sent by the backend after successful insert (see server.js POST /api/appointments)
      const cancelLink = `${window.location.origin}/cancel/${appointmentId}`;

      // Send SMS confirmation
      const smsMessage = `Hi ${formData.name}, your appointment at ${business?.name || 'Our Business'} on ${formatDate(appointmentDate)} at ${formData.time} has been booked. You can cancel or reschedule at: ${cancelLink}`;
      const smsSent = await sendSMS({
        to: formatPhoneNumber(formData.phone),
        message: smsMessage
      });

      if (!smsSent) {
        showNotification('Appointment booked. Check your email for confirmation; SMS could not be sent.', 'warning');
      } else {
        showNotification('Check your email and phone for confirmation.', 'success');
      }
      
      // Prepare booking confirmation data (only fields needed for confirmation page)
      const bookingConfirmationData = {
        appointmentId,
        serviceName: selectedService?.name || 'Service',
        employeeName: selectedEmployee?.name,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: serviceDuration,
        location: business?.business_address,
        ...(selectedService?.price != null && selectedService?.price !== undefined && { price: selectedService.price }),
        cancelLink,
      };

      // Redirect to confirmation page with booking data
      
      navigate('/booking-confirmation', { state: bookingConfirmationData });
      
      // Fallback: if navigation doesn't work, redirect after a short delay
      setTimeout(() => {
        if (window.location.pathname !== '/booking-confirmation') {
          window.location.href = '/booking-confirmation';
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      const errorMessage = error?.message || 'Failed to book appointment. Please try again.';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingBookingSettings || (businessServices.length === 0 && services.length === 0) || (businessEmployees.length === 0 && employees.length === 0)) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-none border-none">
        <CardHeader>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Appointment Booking</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader size="lg" />
            <p className="text-gray-600 text-sm sm:text-base">Loading business settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-none border-none">
        <CardHeader>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">No Available Dates</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600 text-sm sm:text-base">
            No available dates found for the next 14 days. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (businessServices.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-none border-none">
        <CardHeader>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">No Services Available</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600 text-sm sm:text-base">
            No services are currently available. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (businessEmployees.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-none border-none">
        <CardHeader>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">No Employees Available</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600 text-sm sm:text-base">
            No employees are currently available. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg shadow-none mx-auto border-none">
            
      <form onSubmit={handleSubmit}>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-6 py-4">
          {errors.form && (
            <div className="col-span-1 sm:col-span-2 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs sm:text-sm">
              {errors.form}
            </div>
          )}

          {/* Service */}
          <div className="col-span-1 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Briefcase className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Service
            </label>
            <Select
              name="service_id"
              value={formData.service_id}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, service_id: value }));
                setErrors((prev) => ({ ...prev, service_id: '' }));
              }}
              error={errors.service_id}
              required
              options={[
                { value: '', label: 'Select a service' },
                ...businessServices.map((service) => ({
                  value: service.id,
                  label: `${service.name}${service.price != null && service.price !== undefined ? ` - $${service.price}` : ''} (${service.duration} min)`,
                })),
              ]}
            />
          </div>

          {/* Employee */}
          <div className="col-span-1 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Users className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Employee
            </label>
            <Select
              name="employee_id"
              value={formData.employee_id}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, employee_id: value }));
                setErrors((prev) => ({ ...prev, employee_id: '' }));
              }}
              error={errors.employee_id}
              required
              options={[
                { value: '', label: 'Select an employee' },
                ...businessEmployees.map((employee) => ({
                  value: employee.id,
                  label: `${employee.name} (${employee.role})`,
                })),
              ]}
            />
          </div>

          {/* Date & Time (only show when both Service and Employee are chosen) */}
          {formData.service_id && formData.employee_id && (
            <>
              {/* Date - Calendar with unavailable days disabled */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  <Calendar className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Date
                </label>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={formData.date ? parseLocalDate(formData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setFormData((prev) => ({ ...prev, date: `${y}-${m}-${d}` }));
                        setErrors((prev) => ({ ...prev, date: '' }));
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                      if (d < today) return true;
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      return !availableDates.some(ad => `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}` === dateStr);
                    }}
                    fromDate={new Date()}
                    toDate={(() => { const d = new Date(); d.setDate(d.getDate() + 60); return d; })()}
                    className="rdp-root border border-gray-200 rounded-lg p-3 bg-white"
                  />
                </div>
                {errors.date && (
                  <p className="text-red-600 text-xs mt-1">{errors.date}</p>
                )}
              </div>

              {/* Time */}
              <div className="col-span-1 sm:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  <Clock className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Time
                </label>
                <Select
                  name="time"
                  value={formData.time}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, time: value }));
                    setErrors((prev) => ({ ...prev, time: '' }));
                  }}
                  error={errors.time}
                  required
                  options={[
                    { value: '', label: 'Select a time' },
                    ...availableTimeSlots.map((slot) => ({
                      value: slot,
                      label: slot,
                    })),
                  ]}
                />
              </div>
            </>
          )}

          {/* Full Name */}
          <div className="col-span-1 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <User className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Full Name
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              error={errors.name}
              required
            />
          </div>

          {/* Phone */}
          <div className="col-span-1 sm:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Phone className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Phone Number
            </label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+383 44 123 456"
              error={errors.phone}
              required
            />
          </div>

          {/* Email */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Mail className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Email Address
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              error={errors.email}
              required
            />
          </div>

          {/* Notes (full width) */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <FileText className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special requests or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none outline-none focus:border-primary text-sm sm:text-base"
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="col-span-1 sm:col-span-2 flex gap-3 bg-white px-2 sm:px-6 pb-2">
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || isBusinessClosedToday()}
            className="flex-1 text-sm sm:text-base outline-none focus:ring-0 focus:ring-offset-0 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent"
          >
            {isSubmitting
              ? 'Booking Appointment...'
              : isBusinessClosedToday()
              ? 'Business Closed Today'
              : 'Book Appointment'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AppointmentForm;
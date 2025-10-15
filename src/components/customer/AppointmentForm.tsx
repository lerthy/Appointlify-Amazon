import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Clock, FileText, Users, Briefcase, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';
import { sendAppointmentConfirmation } from '../../utils/emailService';
import { sendSMS } from '../../utils/smsService';
import { supabase } from '../../utils/supabaseClient';

interface AppointmentFormProps {
  businessId?: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ businessId }) => {
  const { businessSettings, addAppointment, addCustomer, services, employees } = useApp();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Helper: parse a YYYY-MM-DD string into a local Date at midnight
  const parseLocalDate = (yyyyMmDd: string): Date => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  };

  // Get available dates (next 14 days, excluding closed days and blocked dates)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const blockedDates = businessSettings?.blocked_dates || [];
    const workingHours = businessSettings?.working_hours || [];

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayWorkingHours = workingHours.find((wh: any) => wh.day === dayOfWeek);
      // Exclude blocked dates and closed days
      if (dayWorkingHours && !dayWorkingHours.isClosed && !blockedDates.includes(dateString)) {
        dates.push(date);
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();
  
  // Get available services and employees for this business
  const businessServices = services.filter(service => service.business_id === businessId);
  const businessEmployees = employees.filter(employee => employee.business_id === businessId);

  // Check if business is closed for today
  const isBusinessClosedToday = () => {
    if (!formData.date || !businessSettings) return false;
    
    const selectedDate = parseLocalDate(formData.date);
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    if (!isToday) return false;
    
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const workingHours = businessSettings?.working_hours || [];
    const dayWorkingHours = workingHours.find((wh: any) => wh.day === dayOfWeek);
    
    if (!dayWorkingHours || dayWorkingHours.isClosed) return true;
    
    const [closeHour, closeMinute] = dayWorkingHours.close.split(':').map(Number);
    const closeTime = new Date(selectedDate);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    
    return now >= closeTime;
  };
  
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

  // Set loading state based on business settings
  useEffect(() => {
    if (businessSettings !== null) {
      setIsLoadingSettings(false);
    }
  }, [businessSettings]);

  // Initialize form data when employees and services are loaded
  useEffect(() => {
    if (businessServices.length > 0 && businessEmployees.length > 0 && availableDates.length > 0) {
      setFormData(prev => ({
        ...prev,
        date: prev.date || availableDates[0].toISOString().split('T')[0]
      }));
    }
  }, [businessServices.length, businessEmployees.length, availableDates.length]);

  // Reset time when dependencies change
  useEffect(() => {
    setFormData(prev => ({ ...prev, time: '' }));
  }, [formData.date, formData.employee_id, formData.service_id]);

  // Fetch business data
  useEffect(() => {
    if (!businessId) return;
    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, description, logo')
          .eq('id', businessId)
          .single();
        if (error) throw error;
        if (data) {
          setBusiness(data);
        }
      } catch (err) {
        console.error('Error fetching business:', err);
        showNotification('Failed to load business information. Please try again.', 'error');
      }
    };
    fetchBusiness();
  }, [businessId]);

  // Fetch booked slots for the selected date and employee
  useEffect(() => {
    // Only fetch if we have all required data and the form has been properly initialized
    if (!formData.date || !businessId || !formData.employee_id || !businessSettings) {
      setBookedSlots([]);
      return;
    }
    
    const fetchBookedSlots = async () => {
      try {
        const startOfDay = parseLocalDate(formData.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = parseLocalDate(formData.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const { data, error } = await supabase
          .from('appointments')
          .select('date, duration, employee_id, status')
          .eq('business_id', businessId)
          .eq('employee_id', formData.employee_id) // Only get appointments for the selected employee
          .neq('status', 'cancelled') // Exclude cancelled appointments
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());
          
        if (error) {
          console.error('Supabase error fetching booked slots:', error);
          // Don't show error notification for missing data, just set empty slots
          setBookedSlots([]);
          return;
        }
        
        if (data) {
          const bookedSlots = new Set<string>();
          
          data.forEach((appt: any) => {
            const appointmentTime = new Date(appt.date);
            const duration = appt.duration || 30; // Default to 30 minutes if no duration
            
            // Add all time slots that are occupied by this appointment for this specific employee
            for (let i = 0; i < duration; i += 30) {
              const slotTime = new Date(appointmentTime);
              slotTime.setMinutes(slotTime.getMinutes() + i);
              bookedSlots.add(slotTime.toTimeString().slice(0, 5));
            }
          });
          
          setBookedSlots(Array.from(bookedSlots));
        } else {
          setBookedSlots([]);
        }
      } catch (err) {
        console.error('Error fetching booked slots:', err);
        // Only show error for actual errors, not initialization issues
        if (formData.employee_id && formData.date && businessId) {
          showNotification('Failed to load available time slots. Please try again.', 'error');
        }
        setBookedSlots([]);
      }
    };
    
    fetchBookedSlots();
  }, [formData.date, businessId, formData.employee_id, businessSettings, refreshTrigger]);

  // Add a function to trigger refresh (can be called from parent components)
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for focus events to refresh data when returning to the form
  useEffect(() => {
    const handleFocus = () => {
      triggerRefresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Use duration from selected service or businessSettings.appointment_duration
  const selectedService = businessServices.find(s => s.id === formData.service_id);
  let serviceDuration = selectedService?.duration || businessSettings?.appointment_duration || 30;

  // Generate available time slots for the selected date and employee
  useEffect(() => {
    if (!formData.date || !businessSettings || !formData.employee_id || isLoadingSettings) {
      setAvailableTimeSlots([]);
      return;
    }

    try {
      const slots = getAvailableTimeSlots(parseLocalDate(formData.date), serviceDuration);
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Error generating time slots:', error);
      setAvailableTimeSlots([]);
    }
  }, [formData.date, businessSettings, serviceDuration, bookedSlots, formData.employee_id, isLoadingSettings]);


  const getAvailableTimeSlots = (date: Date, duration: number): string[] => {
    const slots: string[] = [];
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const workingHours = businessSettings?.working_hours || [];
    const dayWorkingHours = workingHours.find((wh: any) => wh.day === dayOfWeek);
    
    if (!dayWorkingHours || dayWorkingHours.isClosed) {
      return slots;
    }

    const [openHour, openMinute] = dayWorkingHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayWorkingHours.close.split(':').map(Number);
    
    const openTime = new Date(date);
    openTime.setHours(openHour, openMinute, 0, 0);
    
    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    
    const currentTime = new Date(openTime);
    
    // Get current date and time to check for past slots
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // No buffer: show the next available slot strictly after the current time
    const currentTimeWithBuffer = now;
    
    while (currentTime < closeTime) {
      const timeString = currentTime.toTimeString().slice(0, 5);
      
      // Skip past times if the selected date is today (with 15-minute buffer)
      if (isToday && currentTime < currentTimeWithBuffer) {
        currentTime.setMinutes(currentTime.getMinutes() + 30);
        continue;
      }
      
      // Check if this time slot and the required duration would fit
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);
      
      // Check if the slot would go beyond closing time
      if (slotEndTime > closeTime) {
        break;
      }
      
      // Check if any part of this time slot is booked
      let isSlotAvailable = true;
      const checkTime = new Date(currentTime);
      
      for (let i = 0; i < duration; i += 30) {
        const checkTimeString = checkTime.toTimeString().slice(0, 5);
        if (bookedSlots.includes(checkTimeString)) {
          isSlotAvailable = false;
          break;
        }
        checkTime.setMinutes(checkTime.getMinutes() + 30);
      }
      
      if (isSlotAvailable) {
        slots.push(timeString);
      }
      
      currentTime.setMinutes(currentTime.getMinutes() + 30); // Move to next 30-minute slot
    }
    
    return slots;
  };

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

      // Check for existing appointments
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, business_id, date')
        .eq('business_id', businessId)
        .gte('date', appointmentDate.toISOString())
        .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString());

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        setErrors(prev => ({ ...prev, form: 'This time slot is already booked. Please choose another time.' }));
        return;
      }

      // Create or find customer
      let customerId = '';
      try {
        // Try to find existing customer by email
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', formData.email)
          .single();
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          customerId = await addCustomer({
            name: formData.name,
            email: formData.email,
            phone: formData.phone
          });
        }
      } catch (error) {
        // If customer lookup fails, create new customer
        customerId = await addCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        });
      }

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

      // Send confirmation email
      const cancelLink = `${window.location.origin}/cancel/${appointmentId}`;
      const emailSent = await sendAppointmentConfirmation({
        to_name: formData.name,
        to_email: formData.email,
        appointment_date: formatDate(appointmentDate),
        appointment_time: formData.time,
        business_name: business?.name || 'Business',
        cancel_link: cancelLink
      });

      // Send SMS confirmation
      const smsMessage = `Hi ${formData.name}, your appointment at ${business?.name || 'Our Business'} on ${formatDate(appointmentDate)} at ${formData.time} has been booked. You can cancel or reschedule at: ${cancelLink}`;
      const smsSent = await sendSMS({
        to: formatPhoneNumber(formData.phone),
        message: smsMessage
      });

      if (!emailSent) {
        showNotification('Appointment booked but email confirmation failed. Please check your email address.', 'error');
      } else if (!smsSent) {
        showNotification('Appointment booked but SMS confirmation failed. Please check your email for confirmation.', 'error');
      } else {
        showNotification('Appointment booked successfully! Check your email and phone for confirmation. 🎉', 'success');
      }
      
      // Prepare booking confirmation data
      const bookingConfirmationData = {
        appointmentId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        businessName: business?.name || 'Business',
        serviceName: selectedService?.name || 'Service',
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: serviceDuration,
        price: selectedService?.price || 0,
        businessLogo: business?.logo,
        cancelLink
      };

      // Redirect to confirmation page with booking data
      console.log('Redirecting to booking confirmation with data:', bookingConfirmationData);
      navigate('/booking-confirmation', { state: bookingConfirmationData });
      
      // Fallback: if navigation doesn't work, redirect after a short delay
      setTimeout(() => {
        if (window.location.pathname !== '/booking-confirmation') {
          window.location.href = '/booking-confirmation';
        }
      }, 1000);
    } catch (error) {
      console.error('Error booking appointment:', error);
      setErrors(prev => ({ ...prev, form: 'Failed to book appointment. Please try again.' }));
      showNotification('Failed to book appointment. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSettings || (businessServices.length === 0 && services.length === 0) || (businessEmployees.length === 0 && employees.length === 0)) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Appointment Booking</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">Loading business settings...</div>
        </CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">No Available Dates</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            No available dates found for the next 14 days. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">No Services Available</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            No services are currently available. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">No Employees Available</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            No employees are currently available. Please contact the business directly.
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg shadow-none mx-auto">
      <CardHeader>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
          type="button"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </CardHeader>
            
      <form onSubmit={handleSubmit}>
        <CardContent className="grid grid-cols-2 gap-4">
          {errors.form && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.form}
            </div>
          )}

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="inline w-4 h-4 mr-1" />
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
                  label: `${service.name} - $${service.price} (${service.duration} min)`,
                })),
              ]}
            />
          </div>

          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
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
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date
                </label>
                <Select
                  name="date"
                  value={formData.date}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, date: value }));
                    setErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  error={errors.date}
                  required
                  options={[
                    { value: '', label: 'Select a date' },
                    ...availableDates.map((date) => ({
                      value: date.toISOString().split('T')[0],
                      label: date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                    })),
                  ]}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline w-4 h-4 mr-1" />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-1" />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline w-4 h-4 mr-1" />
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline w-4 h-4 mr-1" />
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
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline w-4 h-4 mr-1" />
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special requests or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none outline-none"
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="col-span-2 flex gap-3 bg-white">
          <Button
            type="submit"
            disabled={isSubmitting || isBusinessClosedToday()}
            className="flex-1"
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
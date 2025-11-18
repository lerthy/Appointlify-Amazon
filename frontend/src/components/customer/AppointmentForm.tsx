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
        const res = await fetch(`/api/business/${businessId}/info`);
        if (!res.ok) return;
        const json = await res.json();
        if (json?.info) setBusiness(json.info);
      } catch (err) {
        console.error('Error fetching business:', err);
        showNotification('Failed to load business information. Please try again.', 'error');
      }
    };
    fetchBusiness();
  }, [businessId]);

  // Fetch booked appointments for the selected date and employee
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);
  
  useEffect(() => {
    // Only fetch if we have all required data and the form has been properly initialized
    if (!formData.date || !businessId || !formData.employee_id || !businessSettings) {
      setBookedAppointments([]);
      return;
    }
    
    const fetchBookedSlots = async () => {
      try {
        const params = new URLSearchParams({ date: formData.date, employeeId: formData.employee_id });
        const res = await fetch(`/api/business/${businessId}/appointmentsByDay?${params.toString()}`);
        if (!res.ok) { 
          setBookedAppointments([]);
          return; 
        }
        const json = await res.json();
        const data = json?.appointments || [];
        
        // Store full appointment objects for overlap detection
        setBookedAppointments(data);
      } catch (err) {
        console.error('Error fetching booked slots:', err);
        if (formData.employee_id && formData.date && businessId) {
          showNotification('Failed to load available time slots. Please try again.', 'error');
        }
        setBookedAppointments([]);
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
  }, [formData.date, businessSettings, serviceDuration, bookedAppointments, formData.employee_id, isLoadingSettings]);


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
      
      // Skip past times if the selected date is today
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
      
      // Check if this slot overlaps with any booked appointment using proper overlap detection
      let hasOverlap = false;
      
      for (const appt of bookedAppointments) {
        const existingStart = new Date(appt.date);
        const existingEnd = new Date(existingStart.getTime() + (appt.duration || 30) * 60000);
        
        // Check if appointments overlap
        // Overlap occurs if: new starts before existing ends AND new ends after existing starts
        if (currentTime < existingEnd && slotEndTime > existingStart) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
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
        showNotification('Check your email and phone for confirmation.', 'success');
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
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      const errorMessage = error?.message || 'Failed to book appointment. Please try again.';
      setErrors(prev => ({ ...prev, form: errorMessage }));
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSettings || (businessServices.length === 0 && services.length === 0) || (businessEmployees.length === 0 && employees.length === 0)) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-none border-none">
        <CardHeader>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Appointment Booking</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600 text-sm sm:text-base">Loading business settings...</div>
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
                  label: `${service.name} - $${service.price} (${service.duration} min)`,
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
              {/* Date */}
              <div className="col-span-1 sm:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  <Calendar className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none outline-none focus:border-blue-500 text-sm sm:text-base"
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="col-span-1 sm:col-span-2 flex gap-3 bg-white px-2 sm:px-6 pb-2">
          <Button
            type="submit"
            disabled={isSubmitting || isBusinessClosedToday()}
            className="flex-1 text-sm sm:text-base outline-none focus:ring-0 focus:ring-offset-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
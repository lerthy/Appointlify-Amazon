import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, MessageSquare, User, Briefcase } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { formatDate, formatTime, formatPhoneNumber } from '../../utils/formatters';
import { sendAppointmentCancellation } from '../../utils/emailService';
import AlertDialog from '../ui/AlertDialog';
import RealtimeStatus from '../shared/RealtimeStatus';

// Badge variants for appointment statuses
const statusVariants: Record<string, { variant: string; label: string }> = {
  'scheduled': { variant: 'primary', label: 'Scheduled' },
  'confirmed': { variant: 'secondary', label: 'Confirmed' },
  'completed': { variant: 'success', label: 'Completed' },
  'cancelled': { variant: 'danger', label: 'Cancelled' },
  'no-show': { variant: 'warning', label: 'No Show' }
};

const AppointmentManagement: React.FC = () => {
  const { 
    appointments, 
    customers, 
    services, 
    employees,
    businessId,
    updateAppointmentStatus, 
    getServiceById, 
    getCustomerById,
    getEmployeeById
  } = useApp();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Generate calendar dates for the current month
  const generateCalendarDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || dates.length < 42) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };
  
  const calendarDates = generateCalendarDates();

  // Visible dates depend on view mode (month vs current week)
  const getVisibleDates = () => {
    if (viewMode === 'month') return calendarDates;

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return calendarDates.filter(date => date >= startOfWeek && date <= endOfWeek);
  };

  const visibleDates = getVisibleDates();

  // Filter appointments for a specific date and employee
  const getAppointmentsForDate = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return appointments
      .filter(a => {
        const appointmentDate = new Date(a.date);
        const dateMatches = appointmentDate >= startOfDay && appointmentDate <= endOfDay;
        
        // Filter by employee if not "all"
        if (selectedEmployee !== 'all') {
          return dateMatches && a.employee_id === selectedEmployee;
        }
        
        return dateMatches;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get appointments for the selected date, with optional search
  const appointmentsForSelectedDate = getAppointmentsForDate(selectedDate);
  const filteredAppointments = appointmentsForSelectedDate.filter((appointment: any) => {
    if (!searchTerm.trim()) return true;

    const customer = getCustomerById(appointment.customer_id);
    const service = getServiceById(appointment.service_id);
    const employee = getEmployeeById(appointment.employee_id);

    const haystack = [
      customer?.name,
      service?.name,
      employee?.name,
      appointment.notes,
      appointment.email,
      appointment.phone
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  // Dialog actions
  const openConfirmDialog = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setConfirmDialog(true);
  };

  const openCancelDialog = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setCancelDialog(true);
  };

  const openMessageDialog = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setMessageText('');
    setMessageDialog(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppointment) return;
    
    await updateAppointmentStatus(selectedAppointment, 'confirmed');
    
    // Send confirmation SMS
    const appointment = appointments.find(a => a.id === selectedAppointment);
    if (appointment) {
      const customer = getCustomerById(appointment.customer_id);
      const service = getServiceById(appointment.service_id);
      
      if (customer) {
        const message = `Hi ${customer.name}, your appointment for ${service?.name || 'our service'} on ${formatDate(new Date(appointment.date))} at ${formatTime(new Date(appointment.date))} has been confirmed. We look forward to seeing you!`;
        // Note: SMS functionality would need to be implemented
        console.log('SMS would be sent:', message);
      }
    }
    
    setConfirmDialog(false);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    await updateAppointmentStatus(selectedAppointment, 'cancelled');
    
    // Send cancellation email and SMS
    const appointment = appointments.find(a => a.id === selectedAppointment);
    if (appointment) {
      const customer = getCustomerById(appointment.customer_id);
      const service = getServiceById(appointment.service_id);
      
      if (customer && businessId) {
        // Generate reschedule link to book a new appointment with the same business
        const rescheduleLink = `${window.location.origin}/book/${businessId}`;
        
        // Send cancellation email
        const emailSent = await sendAppointmentCancellation({
          to_name: customer.name,
          to_email: customer.email,
          appointment_date: formatDate(new Date(appointment.date)),
          appointment_time: formatTime(new Date(appointment.date)),
          business_name: 'Our Business', // You might want to get this from business settings
          service_name: service?.name || 'Service',
          business_id: businessId,
          reschedule_link: rescheduleLink
        });

        // Send cancellation SMS
        const message = `Hi ${customer.name}, we're sorry to inform you that your appointment on ${formatDate(new Date(appointment.date))} at ${formatTime(new Date(appointment.date))} has been cancelled. Please contact us to reschedule.`;
        // Note: SMS functionality would need to be implemented
        console.log('SMS would be sent:', message);
        console.log('Cancellation email sent:', emailSent);
      }
    }
    
    setCancelDialog(false);
  };

  const handleSendMessage = async () => {
    if (!selectedAppointment || !messageText.trim()) return;
    
    // Send custom message
    const appointment = appointments.find(a => a.id === selectedAppointment);
    if (appointment) {
      const customer = getCustomerById(appointment.customer_id);
      
      if (customer) {
        // Note: SMS functionality would need to be implemented
        console.log('SMS would be sent to', customer.phone, ':', messageText);
      }
    }
    
    setMessageDialog(false);
    setMessageText('');
  };

  const handleMarkCompleted = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, 'completed');
  };

  const handleMarkNoShow = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, 'no-show');
  };

  // Render appointment card
  const renderAppointmentCard = (appointment: any) => {
    const customer = getCustomerById(appointment.customer_id);
    const service = getServiceById(appointment.service_id);
    const employee = getEmployeeById(appointment.employee_id);
    const appointmentTime = new Date(appointment.date);
    const now = new Date();
    const isPastDue = appointmentTime < now && (appointment.status === 'scheduled' || appointment.status === 'confirmed');

    // Fallbacks for customer info
    const customerName = customer ? customer.name : appointment.name;
    const customerPhone = customer ? customer.phone : appointment.phone;
    const customerEmail = customer ? customer.email : appointment.email;

    // Service and employee info
    const serviceName = service ? service.name : 'Unknown Service';
    const servicePrice = service ? `$${service.price}` : '';
    const employeeName = employee ? employee.name : 'Unknown Employee';
    const employeeRole = employee ? employee.role : '';

    return (
      <Card
        key={appointment.id}
        className="mb-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
      >
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 break-words">
                    {customerName}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-1 flex items-center flex-wrap gap-1">
                    <Clock className="inline h-4 w-4 mr-1" />
                    <span>{formatTime(appointmentTime)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="sm:inline-block">
                      {formatDate(appointmentTime)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  {isPastDue && (
                    <Badge variant="warning">
                      Past Due
                    </Badge>
                  )}
                  <Badge variant={statusVariants[appointment.status]?.variant as any}>
                    {statusVariants[appointment.status]?.label}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-xs md:text-sm text-gray-600">
                <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                  <Briefcase size={14} className="mr-2 text-gray-400" />
                  <span className="font-medium">{serviceName}</span>
                  {servicePrice && (
                    <span className="ml-2 text-green-600 font-semibold">{servicePrice}</span>
                  )}
                </div>
                
                <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                  <User size={14} className="mr-2 text-blue-500" />
                  <span className="font-medium text-blue-700">{employeeName}</span>
                  <span className="ml-2 text-blue-600">({employeeRole})</span>
                </div>
                
                {customerPhone && (
                  <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                    <span className="mr-2">📞</span>
                    <a href={`tel:${customerPhone}`} className="text-blue-600 hover:underline font-medium">
                      {formatPhoneNumber(customerPhone)}
                    </a>
                  </div>
                )}
                
                {customerEmail && (
                  <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                    <span className="mr-2">📧</span>
                    <a href={`mailto:${customerEmail}`} className="text-blue-600 hover:underline font-medium">
                      {customerEmail}
                    </a>
                  </div>
                )}
              </div>
              
              {appointment.notes && (
                <div className="mt-3 text-xs md:text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <p className="font-medium mb-1">Notes:</p>
                  <p>{appointment.notes}</p>
                </div>
              )}
            </div>
            
            {/* Actions column: stacked on mobile, column on desktop */}
            <div className="md:ml-4 flex flex-col md:items-end w-full md:w-auto">
              {appointment.status === 'scheduled' && (
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => openConfirmDialog(appointment.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => openMessageDialog(appointment.id)}
                    icon={<MessageSquare size={16} />}
                  >
                    Message
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => openCancelDialog(appointment.id)}
                    icon={<XCircle size={16} />}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              
              {appointment.status === 'confirmed' && (
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button
                    variant="success"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => handleMarkCompleted(appointment.id)}
                    icon={<CheckCircle size={16} />}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => openMessageDialog(appointment.id)}
                    icon={<MessageSquare size={16} />}
                  >
                    Message
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full md:w-auto touch-manipulation"
                    onClick={() => handleMarkNoShow(appointment.id)}
                    icon={<XCircle size={16} />}
                  >
                    No Show
                  </Button>
                </div>
              )}
              
              {appointment.status === 'completed' && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Completed
                </div>
              )}
              
              {appointment.status === 'cancelled' && (
                <div className="text-sm text-red-600 font-medium">
                  ✗ Cancelled
                </div>
              )}
              
              {appointment.status === 'no-show' && (
                <div className="text-sm text-orange-600 font-medium">
                  ⚠ No Show
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mb-8">
      {/* Real-time connection status indicator */}
      <RealtimeStatus businessId={businessId} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left rail: filters / context (desktop) */}
        <div className="hidden lg:block lg:col-span-3 space-y-4">
          {/* Employee Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 pt-3 pb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Team schedule
            </h3>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Filter by employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none text-sm"
            >
              <option value="all">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.role})
                </option>
              ))}
            </select>

            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">Quick overview</p>
              <p>
                Today:{" "}
                <span className="font-semibold text-gray-900">
                  {getAppointmentsForDate(new Date()).length}{" "}
                  appointments
                </span>
              </p>
              <p>
                Selected day:{" "}
                <span className="font-semibold text-gray-900">
                  {appointmentsForSelectedDate.length}{" "}
                  appointments
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Main calendar panel */}
        <div className="lg:col-span-9 space-y-0 mb-8">
          {/* Mobile filters */}
          <div className="lg:hidden flex items-center justify-center mb-3">
            <div className="w-full max-w-xs">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <User className="inline h-3 w-3 mr-1 text-blue-500" />
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full max-w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none text-xs"
              >
                <option value="all">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar View */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Top toolbar */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (viewMode === 'week') {
                      // Move one week back based on the currently selected date
                      const prevWeekDate = new Date(selectedDate);
                      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
                      setSelectedDate(prevWeekDate);
                      setCurrentMonth(new Date(prevWeekDate.getFullYear(), prevWeekDate.getMonth(), 1));
                      return;
                    }

                    const prevMonth = new Date(currentMonth);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    setCurrentMonth(prevMonth);
                  }}
                  className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    const today = new Date();
                    setSelectedDate(today);
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Today
                </button>

                <button
                  onClick={() => {
                    if (viewMode === 'week') {
                      // Move one week forward based on the currently selected date
                      const nextWeekDate = new Date(selectedDate);
                      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                      setSelectedDate(nextWeekDate);
                      setCurrentMonth(new Date(nextWeekDate.getFullYear(), nextWeekDate.getMonth(), 1));
                      return;
                    }

                    const nextMonth = new Date(currentMonth);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    setCurrentMonth(nextMonth);
                  }}
                  className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div className="ml-2">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 leading-tight">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {appointments.length} total upcoming appointments
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                {/* View toggle */}
                <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to week view, snap the selected date to the current month
                      const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                      setSelectedDate(firstOfMonth);
                      setViewMode('week');
                    }}
                    className={`px-3 py-1.5 rounded-full border transition-colors ${
                      viewMode === 'week'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 rounded-full border transition-colors ${
                      viewMode === 'month'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Month
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search appointments..."
                    className="w-full md:w-56 pl-8 pr-3 py-1.5 text-xs md:text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                  <div key={day} className="text-center text-xs md:text-sm font-semibold text-gray-500 py-2 tracking-wide">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                {visibleDates.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  const isToday = new Date().toDateString() === date.toDateString();
                  const dayAppointments = getAppointmentsForDate(date);

                  const counts: Record<string, number> = dayAppointments.reduce(
                    (acc: Record<string, number>, a) => {
                      acc[a.status] = (acc[a.status] || 0) + 1;
                      return acc;
                    },
                    {}
                  );

                  const badges: { key: string; count: number; className: string; title: string }[] =
                    [
                      {
                        key: 'scheduled',
                        count: counts['scheduled'] || 0,
                        className: `${isSelected ? 'border border-yellow-300' : ''} bg-yellow-100 text-yellow-800`,
                        title: 'Scheduled appointments'
                      },
                      {
                        key: 'confirmed',
                        count: counts['confirmed'] || 0,
                        className: `${isSelected ? 'border border-blue-300' : ''} bg-blue-100 text-blue-800`,
                        title: 'Confirmed appointments'
                      },
                      {
                        key: 'completed',
                        count: counts['completed'] || 0,
                        className: `${isSelected ? 'border border-green-300' : ''} bg-green-100 text-green-800`,
                        title: 'Completed appointments'
                      },
                      {
                        key: 'cancelled',
                        count: counts['cancelled'] || 0,
                        className: `${isSelected ? 'border border-red-300' : ''} bg-red-100 text-red-800`,
                        title: 'Cancelled appointments'
                      },
                      {
                        key: 'no-show',
                        count: counts['no-show'] || 0,
                        className: `${isSelected ? 'border border-orange-300' : ''} bg-orange-100 text-orange-800`,
                        title: 'No-show appointments'
                      }
                    ];
                  
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedDate(date);
                        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      }}
                      className={`
                        group min-h-[52px] md:min-h-[110px] p-1.5 md:p-2 border cursor-pointer transition-all duration-150 relative rounded-lg bg-white
                        ${isCurrentMonth ? '' : 'bg-gray-50'}
                        ${isSelected 
                          ? 'border-blue-500 ring-1 ring-blue-200 shadow-sm' 
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                        }
                        ${isToday && !isSelected ? 'border-blue-300 ring-1 ring-blue-100' : ''}
                      `}
                    >
                      <div className="flex h-full flex-col">
                        {/* Centered date number for all viewports */}
                        <div className="flex flex-1 items-center justify-center">
                          {isSelected ? (
                            <>
                              {/* Mobile: just show text without circle */}
                              <span className="md:hidden text-xs font-bold text-gray-900">
                                {date.getDate()}
                              </span>
                              {/* Desktop: show circle with white text */}
                              <span className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold">
                                {date.getDate()}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-xs md:text-sm font-semibold
                                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                                ${isToday && !isSelected ? 'text-blue-600' : ''}
                              `}
                            >
                              {date.getDate()}
                            </span>
                          )}
                        </div>

                        {/* Appointment status indicators (desktop only - positioned at bottom) */}
                        <div className="hidden md:flex flex-wrap gap-1 justify-center items-center mt-1">
                          {badges
                            .filter((b) => b.count > 0)
                            .map((b) => (
                              <span
                                key={b.key}
                                title={b.title}
                                className={`inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full text-[9px] md:text-[10px] font-semibold ${b.className}`}
                              >
                                {b.count}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Single dot on mobile if any appointments - separate, top-right */}
                      {dayAppointments.length > 0 && (
                        <span className="absolute md:hidden top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex flex-wrap items-baseline gap-2">
          <span>
            Appointments for {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          </span>
          {selectedEmployee !== 'all' && (
            <span className="text-gray-600 font-normal">
              {' '}• {employees.find(e => e.id === selectedEmployee)?.name}
            </span>
          )}
          <span className="text-sm font-normal text-gray-500">
            {' '}
            ({filteredAppointments.length} result{filteredAppointments.length === 1 ? '' : 's'}{searchTerm ? ' matching search' : ''})
          </span>
        </h3>
        
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No appointments scheduled for this date.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map(renderAppointmentCard)}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={confirmDialog}
        onCancel={() => setConfirmDialog(false)}
        onConfirm={handleConfirmAppointment}
        title="Confirm Appointment"
        description="Are you sure you want to confirm this appointment? This will send a confirmation message to the customer."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
      />

      {/* Cancellation Dialog */}
      <AlertDialog
        isOpen={cancelDialog}
        onCancel={() => setCancelDialog(false)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This will send a cancellation message to the customer."
        confirmLabel="Cancel Appointment"
        cancelLabel="Keep Appointment"
        variant="danger"
      />

      {/* Message Dialog */}
      <AlertDialog
        isOpen={messageDialog}
        onCancel={() => setMessageDialog(false)}
        onConfirm={handleSendMessage}
        title="Send Message"
        description="Send a custom message to the customer:"
        confirmLabel="Send Message"
        cancelLabel="Cancel"
      />
      {messageDialog && (
        <div className="mt-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Enter your message..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;
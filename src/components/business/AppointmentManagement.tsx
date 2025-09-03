import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, MessageSquare, User, Briefcase } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { formatDate, formatTime, formatPhoneNumber } from '../../utils/formatters';
import AlertDialog from '../ui/AlertDialog';

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
    updateAppointmentStatus, 
    getServiceById, 
    getCustomerById,
    getEmployeeById
  } = useApp();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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

  // Get appointments for the selected date
  const filteredAppointments = getAppointmentsForDate(selectedDate);

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
    
    // Send cancellation SMS
    const appointment = appointments.find(a => a.id === selectedAppointment);
    if (appointment) {
      const customer = getCustomerById(appointment.customer_id);
      
      if (customer) {
        const message = `Hi ${customer.name}, we're sorry to inform you that your appointment on ${formatDate(new Date(appointment.date))} at ${formatTime(new Date(appointment.date))} has been cancelled. Please contact us to reschedule.`;
        // Note: SMS functionality would need to be implemented
        console.log('SMS would be sent:', message);
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
      <Card key={appointment.id} className="mb-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{customerName}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <Clock className="inline h-4 w-4 mr-1" />
                    {formatTime(appointmentTime)} • {formatDate(appointmentTime)}
                  </p>
                </div>
                <Badge variant={statusVariants[appointment.status]?.variant as any}>
                  {statusVariants[appointment.status]?.label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
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
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <p className="font-medium mb-1">Notes:</p>
                  <p>{appointment.notes}</p>
                </div>
              )}
            </div>
            
            <div className="ml-4 flex flex-col space-y-2">
              {appointment.status === 'scheduled' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openConfirmDialog(appointment.id)}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMessageDialog(appointment.id)}
                    icon={<MessageSquare size={16} />}
                  >
                    Message
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCancelDialog(appointment.id)}
                    icon={<XCircle size={16} />}
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              {appointment.status === 'confirmed' && (
                <>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleMarkCompleted(appointment.id)}
                    icon={<CheckCircle size={16} />}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openMessageDialog(appointment.id)}
                    icon={<MessageSquare size={16} />}
                  >
                    Message
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleMarkNoShow(appointment.id)}
                    icon={<XCircle size={16} />}
                  >
                    No Show
                  </Button>
                </>
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
    <div className="space-y-6">
      {/* Employee Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Select an employee
          </label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={() => {
              const prevMonth = new Date(currentMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setCurrentMonth(prevMonth);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={() => {
              const nextMonth = new Date(currentMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setCurrentMonth(nextMonth);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDates.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const isToday = new Date().toDateString() === date.toDateString();
              const dayAppointments = getAppointmentsForDate(date);
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    min-h-[80px] p-2 border cursor-pointer transition-all duration-200 relative rounded-md
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected 
                      ? 'border-blue-500 border-2' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }
                    ${isToday && !isSelected ? 'border-blue-300 border-2' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isToday && !isSelected ? 'text-blue-600' : ''}
                    ${isSelected ? 'text-gray-900 font-bold' : ''}
                  `}>
                    {date.getDate()}
                  </div>
                  
                  {/* Appointment Indicators */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((appointment) => {
                      const status = appointment.status;
                      const statusColors = isSelected ? {
                        'scheduled': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                        'confirmed': 'bg-blue-100 text-blue-800 border border-blue-300',
                        'completed': 'bg-green-100 text-green-800 border border-green-300',
                        'cancelled': 'bg-red-100 text-red-800 border border-red-300',
                        'no-show': 'bg-orange-100 text-orange-800 border border-orange-300'
                      } : {
                        'scheduled': 'bg-yellow-100 text-yellow-800',
                        'confirmed': 'bg-blue-100 text-blue-800',
                        'completed': 'bg-green-100 text-green-800',
                        'cancelled': 'bg-red-100 text-red-800',
                        'no-show': 'bg-orange-100 text-orange-800'
                      };
                      
                      return (
                        <div
                          key={appointment.id}
                          className={`
                            text-xs px-1 py-0.5 rounded truncate font-medium
                            ${statusColors[status] || (isSelected ? 'bg-white text-gray-800 border border-gray-200' : 'bg-gray-100 text-gray-800')}
                          `}
                          title={`${appointment.status} appointment`}
                        >
                          {appointment.status}
                        </div>
                      );
                    })}
                    
                                         {dayAppointments.length > 2 && (
                       <div className={`text-xs ${isSelected ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                         +{dayAppointments.length - 2} more
                       </div>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Appointments for {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          {selectedEmployee !== 'all' && (
            <span className="text-gray-600 font-normal">
              {' '}• {employees.find(e => e.id === selectedEmployee)?.name}
            </span>
          )}
          {' '}({filteredAppointments.length})
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
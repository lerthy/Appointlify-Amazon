import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useNotification } from '../../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Loader from '../ui/Loader';

interface AppointmentData {
  id: string;
  customer_id: string;
  service_id: string;
  business_id: string;
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  duration: number;
  status: string;
  reminder_sent: boolean;
  notes?: string;
  created_at: string;
  // Related data
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    created_at: string;
  };
  service?: {
    id: string;
    name: string;
    description?: string;
    duration: number;
    price: number;
    created_at: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    created_at: string;
  };
}

const CancelAppointment: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<AppointmentData>>({});

  // Sample services list removed (unused)

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) {
        setError('Invalid appointment ID');
        return;
      }

      setLoading(true);
      try {
        // Fetch appointment with related data
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:customers(*),
            service:services(*),
            employee:employees(*)
          `)
          .eq('id', appointmentId)
          .single();

        if (error || !data) {
          throw new Error('Appointment not found');
        }

        setAppointment(data);
        setEditData({
          name: data.name,
          email: data.email,
          phone: data.phone,
          date: data.date,
          notes: data.notes,
        });
      } catch (err) {
        setError('Appointment not found or already cancelled.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const isWithinOneHourOfCreation = () => {
    if (!appointment?.created_at) return false;
    
    const createdAt = new Date(appointment.created_at);
    const currentTime = new Date(Date.now());
    const timeDiffMs = createdAt.getTime() - currentTime.getTime();
    const hoursSinceCreation = timeDiffMs / (1000 * 60 * 60);
    
    return hoursSinceCreation <= 1;
  };

  const handleCancel = async () => {
    if (!isWithinOneHourOfCreation()) {
      showNotification('Cannot cancel appointment - cancellations are allowed only within 1 hour of booking.', 'error');
      return;
    }

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      setCancelled(true);
      showNotification('Appointment cancelled successfully.', 'success');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      showNotification('Failed to cancel appointment. Please try again.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update(editData)
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointment(prev => prev ? { ...prev, ...editData } : null);
      setIsEditing(false);
      showNotification('Appointment updated successfully.', 'success');
    } catch (err) {
      showNotification('Failed to update appointment. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (date: string) => {
    const dateObj = new Date(date);
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-primary/10 text-primary';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="text-center py-12">
            <Loader size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Loading appointment...</h3>
            <p className="text-gray-500 mt-2">Please wait while we fetch your appointment details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="bg-red-50 border-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-red-800">Appointment Not Found</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-6">{error}</p>
              <Button onClick={() => navigate('/')} variant="primary">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="bg-green-50 border-green-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-green-800">Appointment Cancelled</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-green-600 mb-6">Your appointment has been successfully cancelled.</p>
              <p className="text-gray-500">You will be redirected to the home page shortly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const withinOneHourOfCreation = isWithinOneHourOfCreation();
  const hoursSinceCreation = appointment ? Math.floor((new Date().getTime() - new Date(appointment.created_at).getTime()) / (1000 * 60 * 60)) : 0;
  const { date: formattedDate, time: formattedTime } = formatDateTime(appointment?.date || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-light text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-8 w-8 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-2xl font-bold">Appointment Details</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment?.status || '')}`}>
                {appointment?.status?.toUpperCase()}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {!isEditing ? (
              // View Mode
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Service Details
                    </h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Service:</span> {appointment?.service?.name || appointment?.name || 'Not specified'}</p>
                      <p><span className="font-medium">Date:</span> {formattedDate}</p>
                      <p><span className="font-medium">Time:</span> {formattedTime}</p>
                      <p><span className="font-medium">Duration:</span> {appointment?.duration || 0} minutes</p>
                      {appointment?.service?.price && (
                        <p><span className="font-medium">Price:</span> ${appointment.service.price}</p>
                      )}
                      {appointment?.service?.description && (
                        <p><span className="font-medium">Description:</span> {appointment.service.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {appointment?.name || appointment?.customer?.name || 'Not provided'}</p>
                      <p><span className="font-medium">Email:</span> {appointment?.email || appointment?.customer?.email || 'Not provided'}</p>
                      <p><span className="font-medium">Phone:</span> {appointment?.phone || appointment?.customer?.phone || 'Not provided'}</p>
                      {appointment?.customer_id && (
                        <p><span className="font-medium">Customer ID:</span> {appointment.customer_id}</p>
                      )}
                    </div>
                  </div>

                  {appointment?.employee && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Service Provider
                      </h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Name:</span> {appointment.employee.name}</p>
                        <p><span className="font-medium">Role:</span> {appointment.employee.role}</p>
                        <p><span className="font-medium">Email:</span> {appointment.employee.email}</p>
                        <p><span className="font-medium">Phone:</span> {appointment.employee.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Booking Information
                    </h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Appointment ID:</span> {appointment?.id}</p>
                      <p><span className="font-medium">Created:</span> {appointment?.created_at ? formatDate(appointment.created_at) : 'Not available'}</p>
                      <p><span className="font-medium">Reminder Sent:</span> {appointment?.reminder_sent ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {appointment?.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Notes
                      </h3>
                      <p className="text-gray-700">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {!withinOneHourOfCreation && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-red-800">Cannot Cancel Appointment</h3>
                      </div>
                      <p className="text-red-700 mb-2">Appointments can only be cancelled within 1 hour of booking.</p>
                      <p className="text-red-700 font-medium">This appointment was created {hoursSinceCreation} hour(s) ago.</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                      <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Actions
                    </h3>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => setIsEditing(true)}
                        variant="primary"
                        fullWidth
                        icon={
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        }
                      >
                        Edit Appointment
                      </Button>
                      
                      <Button 
                        onClick={handleCancel} 
                        isLoading={cancelling} 
                        variant="danger"
                        fullWidth
                        disabled={!withinOneHourOfCreation}
                        icon={
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      >
                        {withinOneHourOfCreation 
                          ? 'Cancel Appointment'
                          : 'Cannot Cancel (outside 1 hour of booking)'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <svg className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Appointment Details
                  </h3>
                  <p className="text-blue-700">Update your appointment information below.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      label="Customer Name"
                      value={editData.name || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    
                    <Input
                      label="Email"
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    
                    <Input
                      label="Phone"
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Date"
                      type="date"
                      value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const currentTime = appointment?.date ? new Date(appointment.date).toTimeString().split(' ')[0] : '12:00';
                        const newDateTime = `${e.target.value}T${currentTime}`;
                        setEditData(prev => ({ ...prev, date: newDateTime }));
                      }}
                    />
                    
                    <Input
                      label="Time"
                      type="time"
                      value={editData.date ? new Date(editData.date).toTimeString().split(' ')[0] : ''}
                      onChange={(e) => {
                        const currentDate = appointment?.date ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                        const newDateTime = `${currentDate}T${e.target.value}`;
                        setEditData(prev => ({ ...prev, date: newDateTime }));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any special requests or notes..."
                  />
                </div>

                <div className="flex space-x-3">
                  <Button 
                    onClick={handleEdit}
                    isLoading={saving}
                    variant="primary"
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  >
                    Save Changes
                  </Button>
                  
                  <Button 
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    }
                  >
                    Cancel Edit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CancelAppointment;

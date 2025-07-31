import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useNotification } from '../../context/NotificationContext';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';

const CancelAppointment: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) {
        setError('Invalid appointment ID');
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        if (error || !data) {
          throw new Error('Appointment not found');
        }

        setAppointment(data);
      } catch (err) {
        setError('Appointment not found or already cancelled.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const isWithinSixHours = () => {
    if (!appointment?.date) return false;
    
    const appointmentTime = new Date(appointment.date);
    const currentTime = new Date();
    const timeDiff = appointmentTime.getTime() - currentTime.getTime();
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilAppointment <= 6;
  };

  const handleCancel = async () => {
    if (isWithinSixHours()) {
      showNotification('Cannot cancel appointment - it is within 6 hours of the scheduled time.', 'error');
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

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader>
          <h2 className="text-2xl font-bold">Cancel Appointment</h2>
        </CardHeader>
        <CardContent>
          <div>Loading appointment...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader>
          <h2 className="text-2xl font-bold">Cancel Appointment</h2>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (cancelled) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10">
        <CardHeader>
          <h2 className="text-2xl font-bold">Appointment Cancelled</h2>
        </CardHeader>
        <CardContent>
          <div>Your appointment has been cancelled. You will be redirected shortly.</div>
        </CardContent>
      </Card>
    );
  }

  const withinSixHours = isWithinSixHours();
  const hoursRemaining = appointment ? Math.round((new Date(appointment.date).getTime() - new Date().getTime()) / (1000 * 60 * 60)) : 0;

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardHeader>
        <h2 className="text-2xl font-bold">Cancel Appointment</h2>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p>Are you sure you want to cancel your appointment for <b>{appointment.service_name || 'this service'}</b> on <b>{new Date(appointment.date).toLocaleString()}</b>?</p>
          {withinSixHours && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              <p className="font-bold">⚠️ Cannot Cancel Appointment</p>
              <p>Appointments can only be cancelled at least 6 hours before the scheduled time.</p>
              <p>Your appointment is in {hoursRemaining} hours.</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleCancel} 
          isLoading={cancelling} 
          color="danger"
          disabled={withinSixHours}
          className={withinSixHours ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {withinSixHours 
            ? `Cannot Cancel (${hoursRemaining} hours until appointment)` 
            : 'Yes, Cancel Appointment'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CancelAppointment; // Advanced appointments

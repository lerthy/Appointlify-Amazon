import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Calendar, Clock, User, Briefcase, Phone, Mail, FileText,
  CheckCircle, XCircle, Edit3, Save, ChevronLeft
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useNotification } from '../../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import AlertDialog from '../ui/AlertDialog';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface WorkingHourEntry {
  day: string;
  open?: string;
  close?: string;
  isClosed?: boolean;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  working_hours?: WorkingHourEntry[] | null;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number | null;
}

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
  customer?: { id: string; name: string; email: string; phone: string; created_at: string };
  service?: Service;
  employee?: Employee;
}

interface EditState {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  notes: string;
  employee_id: string;
  service_id: string;
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function formatDisplayDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

const CancelAppointment: React.FC = () => {
  const { t } = useTranslation();
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
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // Data for selectors
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [businessSettings, setBusinessSettings] = useState<{ working_hours?: WorkingHourEntry[]; blocked_dates?: string[] } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<EditState>({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
    employee_id: '',
    service_id: ''
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) {
        setError(t('common.errors.invalidAppointmentId'));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`*, customer:customers(*), service:services(*), employee:employees(*)`)
          .eq('id', appointmentId)
          .single();

        if (error || !data) throw new Error('Appointment not found');

        setAppointment(data);
        const apptDate = new Date(data.date);
        const y = apptDate.getFullYear();
        const mo = String(apptDate.getMonth() + 1).padStart(2, '0');
        const da = String(apptDate.getDate()).padStart(2, '0');
        const hh = String(apptDate.getHours()).padStart(2, '0');
        const mm = String(apptDate.getMinutes()).padStart(2, '0');
        setEditData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          date: `${y}-${mo}-${da}`,
          time: `${hh}:${mm}`,
          notes: data.notes || '',
          employee_id: data.employee_id || '',
          service_id: data.service_id || ''
        });

        // Load business data in parallel
        if (data.business_id) {
          const [empRes, svcRes, settingsRes] = await Promise.all([
            fetch(`/api/employees?businessId=${data.business_id}`),
            fetch(`/api/business/${data.business_id}/services`),
            fetch(`/api/business/${data.business_id}/settings`)
          ]);
          if (empRes.ok) {
            const empJson = await empRes.json();
            setEmployees(empJson?.employees || []);
          }
          if (svcRes.ok) {
            const svcJson = await svcRes.json();
            setServices(svcJson?.services || []);
          }
          if (settingsRes.ok) {
            const settingsJson = await settingsRes.json();
            setBusinessSettings(settingsJson?.settings || null);
          }
        }
      } catch {
        setError(t('common.errors.appointmentNotFound'));
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, t]);

  // Compute effective working hours for the selected employee
  const getEffectiveWorkingHours = useCallback((): WorkingHourEntry[] => {
    const emp = employees.find(e => e.id === editData.employee_id);
    if (emp?.working_hours && Array.isArray(emp.working_hours) && emp.working_hours.length > 0) {
      return emp.working_hours;
    }
    return businessSettings?.working_hours || [];
  }, [employees, editData.employee_id, businessSettings]);

  // Same 60-day window + blocked/closed rules as AppointmentForm (book page)
  const availableDates = useMemo(() => {
    let workingHours = getEffectiveWorkingHours();
    if ((!Array.isArray(workingHours) || workingHours.length === 0) && businessSettings) {
      workingHours = [
        { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
        { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
        { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
      ];
    }
    if (!Array.isArray(workingHours) || workingHours.length === 0) return [];
    const blockedDates = businessSettings?.blocked_dates || [];
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayWorkingHours = workingHours.find((wh) => wh.day === dayOfWeek);
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
  }, [getEffectiveWorkingHours, businessSettings]);

  useEffect(() => {
    if (!isEditing || !editData.date || availableDates.length === 0) return;
    const dateStr = editData.date;
    const isInAvailable = availableDates.some((d) => {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return ds === dateStr;
    });
    if (!isInAvailable) {
      const first = availableDates[0];
      const fy = first.getFullYear();
      const fm = String(first.getMonth() + 1).padStart(2, '0');
      const fd = String(first.getDate()).padStart(2, '0');
      setEditData((prev) => ({ ...prev, date: `${fy}-${fm}-${fd}`, time: '' }));
    }
  }, [availableDates, editData.date, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [isEditing]);

  // Compute available time slots for the selected date + employee + service
  const fetchAvailableSlots = useCallback(async (date: string, employeeId: string, serviceId: string) => {
    if (!date || !employeeId || !serviceId || !appointment?.business_id) return;

    setLoadingSlots(true);
    try {
      const service = services.find(s => s.id === serviceId);
      const duration = service?.duration || appointment.duration || 30;

      const res = await fetch(
        `/api/business/${appointment.business_id}/appointmentsByDay?date=${date}&employeeId=${employeeId}`
      );
      const json = res.ok ? await res.json() : { appointments: [] };
      const bookedAppts = (json.appointments || []).filter(
        (a: any) => a.id !== appointmentId && ['scheduled', 'confirmed', 'completed'].includes(a.status)
      );

      const selectedDate = new Date(`${date}T00:00:00`);
      const wh = getEffectiveWorkingHours();
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dayHours = wh.find(d => d.day === dayName);

      if (!dayHours || dayHours.isClosed) {
        setAvailableSlots([]);
        setLoadingSlots(false);
        return;
      }

      const [openH, openM] = (dayHours.open || '09:00').split(':').map(Number);
      const [closeH, closeM] = (dayHours.close || '17:00').split(':').map(Number);
      const openTime = new Date(selectedDate);
      openTime.setHours(openH, openM, 0, 0);
      const closeTime = new Date(selectedDate);
      closeTime.setHours(closeH, closeM, 0, 0);

      const slots: string[] = [];
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      let current = new Date(openTime);

      while (current < closeTime) {
        if (isToday && current < new Date(now.getTime() + 5 * 60000)) {
          current.setMinutes(current.getMinutes() + 30);
          continue;
        }
        const slotEnd = new Date(current.getTime() + duration * 60000);
        if (slotEnd > closeTime) break;

        const hasOverlap = bookedAppts.some((appt: any) => {
          const s = new Date(appt.date);
          const e = new Date(s.getTime() + (appt.duration || 30) * 60000);
          return current < e && slotEnd > s;
        });

        if (!hasOverlap) slots.push(current.toTimeString().slice(0, 5));
        current.setMinutes(current.getMinutes() + 30);
      }

      setAvailableSlots(slots);
    } catch (err) {
      console.error('[CancelAppointment] Error fetching slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [appointment?.business_id, appointment?.duration, appointmentId, services, getEffectiveWorkingHours]);

  // Reload slots when date/employee/service changes
  useEffect(() => {
    if (isEditing && editData.date && editData.employee_id && editData.service_id) {
      fetchAvailableSlots(editData.date, editData.employee_id, editData.service_id);
    }
  }, [isEditing, editData.date, editData.employee_id, editData.service_id, fetchAvailableSlots]);

  const isWithinOneHourOfCreation = () => {
    if (!appointment?.created_at) return false;
    const hoursSince = (Date.now() - new Date(appointment.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSince <= 1 && hoursSince >= 0;
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editData.name.trim()) errors.name = 'Name is required';
    if (!editData.email.trim()) errors.email = 'Email is required';
    if (!editData.phone.trim()) errors.phone = 'Phone is required';
    if (!editData.service_id) errors.service_id = 'Service is required';
    if (!editData.employee_id) errors.employee_id = 'Employee is required';
    if (!editData.date) {
      errors.date = 'Date is required';
    } else {
      const inList = availableDates.some((d) => {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ds === editData.date;
      });
      if (!inList) {
        errors.date = 'Please select an available date';
      } else if (editData.time) {
        const [h, min] = editData.time.split(':').map(Number);
        const dt = parseLocalDate(editData.date);
        dt.setHours(h, min || 0, 0, 0);
        if (dt <= new Date()) {
          errors.date = 'Cannot select a past date or time';
        }
      }
    }
    if (!editData.time) errors.time = 'Time is required';

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = async () => {
    if (!validateEditForm()) return;

    setSaving(true);
    try {
      const [hours, minutes] = editData.time.split(':').map(Number);
      const appointmentDate = parseLocalDate(editData.date);
      appointmentDate.setHours(hours, minutes || 0, 0, 0);
      appointmentDate.setSeconds(0, 0);
      const newDateTime = appointmentDate.toISOString();
      const service = services.find(s => s.id === editData.service_id);

      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name.trim(),
          email: editData.email.trim(),
          phone: editData.phone.trim(),
          notes: editData.notes,
          date: newDateTime,
          employee_id: editData.employee_id,
          service_id: editData.service_id,
          duration: service?.duration ?? appointment?.duration ?? 30
        })
      });

      const json = await res.json();
      if (!res.ok) {
        const detail = [json.details, json.code].filter(Boolean).join(' ').trim();
        throw new Error(
          detail ? `${json.error || 'Failed to update appointment'} (${detail})` : json.error || 'Failed to update appointment'
        );
      }

      // Refresh local appointment data
      const { data: updated } = await supabase
        .from('appointments')
        .select(`*, customer:customers(*), service:services(*), employee:employees(*)`)
        .eq('id', appointmentId)
        .single();
      if (updated) setAppointment(updated);

      setIsEditing(false);
      showNotification(t('cancelAppointment.updateSuccess'), 'success');
    } catch (err: any) {
      console.error('[CancelAppointment] Edit error:', err);
      showNotification(err.message || t('cancelAppointment.updateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!isWithinOneHourOfCreation()) {
      showNotification(t('cancelAppointment.cancelNotAllowed'), 'error');
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel');

      setCancelled(true);
      setShowCancelConfirmModal(false);
      showNotification(t('cancelAppointment.success'), 'success');
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      showNotification(err.message || t('cancelAppointment.cancelFailed'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="h-4 w-4" /> },
      completed: { bg: 'bg-primary/10', text: 'text-primary', icon: <CheckCircle className="h-4 w-4" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="h-4 w-4" /> },
      'no-show': { bg: 'bg-orange-100', text: 'text-orange-800', icon: <XCircle className="h-4 w-4" /> }
    };
    return configs[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };
  };

  const withinOneHour = isWithinOneHourOfCreation();
  const hoursSince = appointment
    ? Math.floor((Date.now() - new Date(appointment.created_at).getTime()) / (1000 * 60 * 60))
    : 0;

  // ─── Loading / Error / Cancelled states ──────────────────────────────────

  const pageWrapper = (content: React.ReactNode) => (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background">
      <Header />
      <main className="flex-grow py-6 sm:py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-6 group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </button>
          {content}
        </div>
      </main>
      <Footer />
    </div>
  );

  if (loading) {
    return pageWrapper(
      <Card className="shadow-sm">
        <CardContent className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{t('cancelAppointment.loading')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('cancelAppointment.loadingDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return pageWrapper(
      <Card className="shadow-sm border-red-200">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cancelAppointment.notFound')}</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')} variant="primary" icon={<ArrowLeft className="h-4 w-4" />}>
            {t('cancelAppointment.backToHome')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (cancelled) {
    return pageWrapper(
      <Card className="shadow-sm border-green-200">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('cancelAppointment.appointmentCancelled')}</h2>
          <p className="text-green-700 mb-2">{t('cancelAppointment.successCancelledMessage')}</p>
          <p className="text-sm text-gray-500">{t('cancelAppointment.redirectingMessage')}</p>
        </CardContent>
      </Card>
    );
  }

  const { date: formattedDate, time: formattedTime } = formatDateTime(appointment?.date || '');
  const statusConfig = getStatusConfig(appointment?.status || '');
  const currentService = services.find(s => s.id === editData.service_id) || appointment?.service;

  // ─── View Mode ───────────────────────────────────────────────────────────

  const viewMode = (
    <div className="space-y-4">
      {/* Service Info */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Service
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Service:</span>{' '}
            <span className="font-medium">{appointment?.service?.name || appointment?.name || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="font-medium">{appointment?.duration} min</span>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div>
            <span className="text-gray-500">Time:</span>{' '}
            <span className="font-medium">{formattedTime}</span>
          </div>
          {appointment?.service?.price != null && (
            <div>
              <span className="text-gray-500">Price:</span>{' '}
              <span className="font-semibold text-primary">${appointment.service.price}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Customer
        </h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <span>{appointment?.name || appointment?.customer?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            <span>{appointment?.email || appointment?.customer?.email || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            <span>{appointment?.phone || appointment?.customer?.phone || '—'}</span>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      {appointment?.employee && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Service Provider
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{' '}
              <span className="font-medium">{appointment.employee.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Role:</span>{' '}
              <span className="font-medium">{appointment.employee.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {appointment?.notes && (
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notes
          </h3>
          <p className="text-sm text-gray-700">{appointment.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={() => setIsEditing(true)}
          variant="primary"
          className="flex-1"
          icon={<Edit3 className="h-4 w-4" />}
        >
          {t('cancelAppointment.editAppointment')}
        </Button>
        <Button
          onClick={() => setShowCancelConfirmModal(true)}
          isLoading={cancelling}
          variant="danger"
          className="flex-1"
          disabled={!withinOneHour}
          icon={<XCircle className="h-4 w-4" />}
        >
          {withinOneHour ? t('cancelAppointment.cancelButton') : t('cancelAppointment.cannotCancelButton')}
        </Button>
      </div>

      {!withinOneHour && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {t('cancelAppointment.cannotCancelDescription')}
            {' '}
            {t('cancelAppointment.createdTimeAgo', { hours: hoursSince })}
          </p>
        </div>
      )}
    </div>
  );

  // ─── Edit Mode ───────────────────────────────────────────────────────────

  const editMode = (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
        <Edit3 className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-800">{t('cancelAppointment.editDetails')}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('cancelAppointment.editDescription')}</p>
        </div>
      </div>

      {/* Customer fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Input
            label={t('cancelAppointment.labels.customerName')}
            value={editData.name}
            onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
          />
          {editErrors.name && <p className="text-xs text-red-500 mt-1">{editErrors.name}</p>}
        </div>
        <div>
          <Input
            label={t('cancelAppointment.labels.phone')}
            type="tel"
            value={editData.phone}
            onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))}
          />
          {editErrors.phone && <p className="text-xs text-red-500 mt-1">{editErrors.phone}</p>}
        </div>
        <div className="sm:col-span-2">
          <Input
            label={t('cancelAppointment.labels.email')}
            type="email"
            value={editData.email}
            onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
          />
          {editErrors.email && <p className="text-xs text-red-500 mt-1">{editErrors.email}</p>}
        </div>
      </div>

      {/* Service & Employee selectors */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm bg-white"
            value={editData.service_id}
            onChange={e => setEditData(p => ({ ...p, service_id: e.target.value, time: '' }))}
          >
            <option value="">Select service</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration} min{s.price != null ? ` — $${s.price}` : ''})
              </option>
            ))}
          </select>
          {editErrors.service_id && <p className="text-xs text-red-500 mt-1">{editErrors.service_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm bg-white"
            value={editData.employee_id}
            onChange={e => setEditData(p => ({ ...p, employee_id: e.target.value, time: '' }))}
          >
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role})
              </option>
            ))}
          </select>
          {editErrors.employee_id && <p className="text-xs text-red-500 mt-1">{editErrors.employee_id}</p>}
        </div>
      </div>

      {/* Date & Time — same UI as book appointment (DayPicker + slot grid) */}
      {editData.service_id && editData.employee_id && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Calendar className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              {t('cancelAppointment.labels.date')}
            </label>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`w-full px-3 py-2 border rounded-lg text-left text-sm sm:text-base transition-colors ${
                editErrors.date ? 'border-red-500' : 'border-gray-300 hover:border-primary focus:border-primary'
              } ${editData.date ? 'text-gray-900' : 'text-gray-500'}`}
            >
              {editData.date ? formatDisplayDate(editData.date) : 'Select a date'}
            </button>
            {editErrors.date && <p className="text-red-600 text-xs mt-1">{editErrors.date}</p>}
            {availableDates.length === 0 && businessSettings && (
              <p className="text-xs text-amber-600 mt-1">No bookable days in the next 60 days. Check business hours.</p>
            )}
            {showDatePicker && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowDatePicker(false)} aria-hidden="true" />
                <div className="absolute z-[100] mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <DayPicker
                    mode="single"
                    selected={editData.date ? parseLocalDate(editData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setEditData((prev) => ({ ...prev, date: `${y}-${m}-${d}`, time: '' }));
                        setEditErrors((prev) => ({ ...prev, date: '', time: '' }));
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const cal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                      if (cal < today) return true;
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      return !availableDates.some(
                        (ad) =>
                          `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}-${String(ad.getDate()).padStart(2, '0')}` === dateStr
                      );
                    }}
                    fromDate={new Date()}
                    toDate={(() => {
                      const end = new Date();
                      end.setDate(end.getDate() + 60);
                      return end;
                    })()}
                    className="rdp-root"
                  />
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              <Clock className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              {t('cancelAppointment.labels.time')}
            </label>
            <button
              type="button"
              onClick={() => editData.date && setShowTimePicker(!showTimePicker)}
              disabled={!editData.date}
              className={`w-full px-3 py-2 border rounded-lg text-left text-sm sm:text-base transition-colors ${
                editErrors.time ? 'border-red-500' : 'border-gray-300 hover:border-primary focus:border-primary'
              } ${editData.time ? 'text-gray-900' : 'text-gray-500'} ${!editData.date ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {editData.time || (editData.date ? 'Select a time' : 'Select date first')}
            </button>
            {editErrors.time && <p className="text-red-600 text-xs mt-1">{editErrors.time}</p>}
            {showTimePicker && editData.date && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowTimePicker(false)} aria-hidden="true" />
                <div className="absolute z-[100] mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto">
                  {loadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
                      <p className="text-sm">Loading times…</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Clock className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-sm font-medium">No available times</p>
                      <p className="text-xs mt-1">Try selecting another date</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-3 font-medium">
                        Available times for {formatDisplayDate(editData.date)}
                      </p>
                      <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const isSelected = editData.time === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setEditData((prev) => ({ ...prev, time: slot }));
                                setEditErrors((prev) => ({ ...prev, time: '' }));
                                setShowTimePicker(false);
                              }}
                              className={`py-2.5 px-1 rounded-lg text-sm font-medium transition-all duration-150 border ${
                                isSelected
                                  ? 'bg-primary text-white border-primary shadow-md'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-primary/10 hover:border-primary/40 hover:text-primary'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
          <FileText className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
          {t('cancelAppointment.labels.notesSection')}
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none outline-none focus:border-primary text-sm sm:text-base"
          rows={3}
          value={editData.notes}
          onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
          placeholder={t('cancelAppointment.notesPlaceholder')}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button
          onClick={handleEdit}
          isLoading={saving}
          variant="primary"
          className="flex-1"
          icon={<Save className="h-4 w-4" />}
        >
          {t('cancelAppointment.saveChanges')}
        </Button>
        <Button
          onClick={() => {
            setIsEditing(false);
            setEditErrors({});
            if (appointment) {
              const apptDate = new Date(appointment.date);
              const yy = apptDate.getFullYear();
              const mo = String(apptDate.getMonth() + 1).padStart(2, '0');
              const da = String(apptDate.getDate()).padStart(2, '0');
              const hh = String(apptDate.getHours()).padStart(2, '0');
              const mm = String(apptDate.getMinutes()).padStart(2, '0');
              setEditData({
                name: appointment.name || '',
                email: appointment.email || '',
                phone: appointment.phone || '',
                date: `${yy}-${mo}-${da}`,
                time: `${hh}:${mm}`,
                notes: appointment.notes || '',
                employee_id: appointment.employee_id || '',
                service_id: appointment.service_id || ''
              });
            }
          }}
          variant="outline"
          className="flex-1"
          icon={<XCircle className="h-4 w-4" />}
        >
          {t('cancelAppointment.cancelEdit')}
        </Button>
      </div>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────

  return pageWrapper(
    <Card className="shadow-sm overflow-visible">
      {/* Card Header — rounded top only; card must not use overflow-hidden or DayPicker popovers clip */}
      <CardHeader className="bg-gradient-to-r from-primary to-primary-light px-6 py-5 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('cancelAppointment.appointmentDetails')}</h1>
              <p className="text-white/70 text-sm mt-0.5">Appointment ID: {appointment?.id?.slice(0, 8)}…</p>
            </div>
          </div>
          {appointment?.status && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.icon}
              {appointment.status.toUpperCase()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 rounded-b-xl">
        {isEditing ? editMode : viewMode}
      </CardContent>

      <AlertDialog
        isOpen={showCancelConfirmModal}
        onCancel={() => setShowCancelConfirmModal(false)}
        onConfirm={async () => {
          setShowCancelConfirmModal(false);
          await handleCancel();
        }}
        title={t('cancelAppointment.confirmCancelTitle')}
        description={t('cancelAppointment.confirmCancelDescription')}
        confirmLabel={t('cancelAppointment.yesCancel')}
        cancelLabel={t('cancelAppointment.keepAppointment')}
        variant="danger"
      />
    </Card>
  );
};

export default CancelAppointment;

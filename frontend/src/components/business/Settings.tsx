import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertCircle, Clock, Link2, ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import { useGoogleOAuth } from '../../hooks/useGoogleOAuth';
import { authenticatedFetch } from '../../utils/apiClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

type WorkingDayMap = Record<string, boolean>;
type WorkingHour = {
  day: string;
  isClosed?: boolean;
  open?: string;
  close?: string;
};

const Settings: React.FC = () => {
  const { businessSettings, updateBusinessSettings } = useApp();
  const [workingDays, setWorkingDays] = useState<WorkingDayMap>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false
  });
  const [opening, setOpening] = useState('09:00');
  const [closing, setClosing] = useState('17:00');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');
  const [breaks, setBreaks] = useState<Array<{ start: string; end: string }>>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const businessId = user?.id;
  const [calendarState, setCalendarState] = useState({
    loading: true,
    linked: false,
    needsMigration: false,
    warning: '',
  });
  const { launch, loading: linking, error: linkingError } = useGoogleOAuth('calendar');

  const refreshCalendarState = useCallback(async () => {
    try {
      const payload = await authenticatedFetch<{
        linked: boolean;
        needsMigration?: boolean;
        status?: { status: string };
        success?: boolean;
        error?: string;
      }>(`${API_BASE}/api/integrations/google/status`);

      if (payload.success === false) {
        throw new Error(payload.error || 'Failed to fetch calendar status');
      }

      setCalendarState({
        loading: false,
        linked: Boolean(payload.linked),
        needsMigration: Boolean(payload.needsMigration),
        warning: payload.status?.status === 'disconnected' ? 'We could not refresh your Google Calendar. Reconnect to resume syncing.' : '',
      });
    } catch (err) {
      console.error('[Settings] Error refreshing calendar state:', err);
      const message = err instanceof Error ? err.message : 'Failed to load calendar status';
      setCalendarState(prev => ({
        ...prev,
        loading: false,
        warning: message,
      }));
    }
  }, []);

  useEffect(() => {
    if (businessSettings) {
      // Load working days from settings
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const loadedWorkingDays: WorkingDayMap = {};
      const workingHourSource = businessSettings.working_hours as WorkingHour[] | undefined;
      days.forEach(day => {
        const daySettings = workingHourSource?.find((wh) => wh.day === day);
        // If day is found, use its isClosed value (inverted: false = open, true = closed)
        // If day is not found, default to open (true)
        loadedWorkingDays[day] = daySettings ? daySettings.isClosed !== true : true;
      });
      setWorkingDays(loadedWorkingDays);

      // Find Monday's hours specifically, or use first available day, or default
      const mondayHours = businessSettings.working_hours?.find((wh: WorkingHour) => wh.day === 'Monday');
      const firstAvailableHours = businessSettings.working_hours?.find((wh: WorkingHour) => wh.isClosed !== true);
      const hoursToUse = mondayHours || firstAvailableHours || { open: '09:00', close: '17:00' };

      setOpening(hoursToUse.open || '09:00');
      setClosing(hoursToUse.close || '17:00');
      setBreaks(Array.isArray(businessSettings.breaks) ? businessSettings.breaks : []);
      setBlockedDates(businessSettings.blocked_dates || []);
    } else {
      // Set default values when businessSettings is null
      setWorkingDays({
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: true,
        Saturday: false,
        Sunday: false
      });
      setOpening('09:00');
      setClosing('17:00');
      setBreaks([]);
      setBlockedDates([]);
    }
  }, [businessSettings]);

  useEffect(() => {
    if (user) {
      refreshCalendarState();
    }
  }, [refreshCalendarState, user]);

  const handleAddBreak = () => {
    console.log('=== ADD BREAK ATTEMPT ===');
    console.log('Break start:', breakStart);
    console.log('Break end:', breakEnd);
    console.log('Current breaks before add:', breaks);

    if (!breakStart || !breakEnd) {
      console.log('Missing break start or end time');
      return;
    }
    if (breakStart >= breakEnd) {
      setError('Break end time must be after start time');
      console.log('Invalid time range');
      return;
    }

    const newBreak = { start: breakStart, end: breakEnd };
    console.log('Adding new break:', newBreak);

    setBreaks(prev => {
      const newBreaks = [...prev, newBreak];
      console.log('Updated breaks array:', newBreaks);
      return newBreaks;
    });

    setBreakStart('');
    setBreakEnd('');
    console.log('=== ADD BREAK COMPLETE ===');
  };

  const handleRemoveBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    console.log('=== SAVE ATTEMPT START ===');
    console.log('Current breaks state:', breaks);
    console.log('Breaks length:', breaks.length);
    console.log('Breaks type:', typeof breaks);
    console.log('Business ID:', businessId);

    try {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const workingHours = days.map(day => ({
        day,
        open: opening,
        close: closing,
        isClosed: !workingDays[day as keyof typeof workingDays]
      }));

      const settingsToSave = {
        working_hours: workingHours,
        blocked_dates: blockedDates,
        breaks: breaks
      };

      console.log('Settings object being saved:', settingsToSave);
      console.log('Breaks in settings object:', settingsToSave.breaks);

      await updateBusinessSettings(settingsToSave);

      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 2000);
      console.log('=== SAVE SUCCESSFUL ===');
    } catch (err) {
      console.error('=== SAVE ERROR ===', err);
      const message = err instanceof Error ? err.message : 'Failed to save settings. Please try again.';
      setError(message);
    }
  };

  const connectCalendar = async () => {
    try {
      const result = await launch();

      // Wait a bit for the backend to process the token
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Always refresh status after OAuth flow
      await refreshCalendarState();

      // Also check if result indicates success
      if (result?.success && result?.calendarLinked) {
        setCalendarState(prev => ({ ...prev, linked: true, warning: '' }));
      } else if (result?.success) {
        // Status refresh should have updated it, but let's make sure
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshCalendarState();
      }
    } catch (err) {
      console.error('[Settings] Calendar connection error:', err);
      const message = err instanceof Error ? err.message : 'Failed to connect calendar';
      setCalendarState(prev => ({ ...prev, warning: message }));
    }
  };

  const disconnectCalendar = async () => {
    try {
      await authenticatedFetch(`${API_BASE}/api/integrations/google/disconnect`, {
        method: 'POST',
      });
      await refreshCalendarState();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setCalendarState(prev => ({ ...prev, warning: message }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="space-y-6 md:space-y-8">
        {/* Weekend Availability */}
        <Card className="border border-gray-200">
          <CardHeader>
            <h3 className="text-base md:text-lg font-semibold flex items-center">
              <Link2 className="mr-2" size={18} />
              Google Calendar
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                Grant access so we may sync thy bookings with thine own Google Calendar.
              </p>
              {calendarState.warning && (
                <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <ShieldAlert className="w-4 h-4 mt-0.5" />
                  <span>{calendarState.warning}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {calendarState.linked ? 'Calendar linked' : 'Not linked'}
                  </p>
                  {calendarState.needsMigration && (
                    <p className="text-xs text-amber-600">
                      Permissions changed. Reconnect to refresh Google scopes.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {calendarState.linked ? (
                    <Button variant="outline" onClick={disconnectCalendar} disabled={linking}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button onClick={connectCalendar} disabled={linking}>
                      {linking ? 'Connecting…' : 'Connect Calendar'}
                    </Button>
                  )}
                </div>
              </div>
              {linkingError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                  {linkingError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader>
            <h3 className="text-base md:text-lg font-semibold flex items-center">
              <Calendar className="mr-2" size={18} />
              Working Days
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-2 md:gap-3">
              {Object.keys(workingDays).map((day) => (
                <label
                  key={day}
                  className={`flex flex-col items-center justify-center p-2 md:p-2 border-2 rounded-lg cursor-pointer transition-all ${workingDays[day as keyof typeof workingDays]
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={workingDays[day as keyof typeof workingDays]}
                    onChange={e => setWorkingDays(prev => ({ ...prev, [day]: e.target.checked }))}
                  />
                  <span className="text-xs md:text-sm font-medium text-gray-700">
                    {day.slice(0, 3)}
                  </span>
                  <span className={`text-xl md:text-2xl mt-1 ${workingDays[day as keyof typeof workingDays] ? 'opacity-100' : 'opacity-30'
                    }`}>
                    {workingDays[day as keyof typeof workingDays] ? '✓' : '○'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-4">
              Select which days your business is open for appointments.
            </p>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card className="border border-gray-200">
          <CardHeader>
            <h3 className="text-base md:text-lg font-semibold flex items-center">
              <Clock className="mr-2" size={18} />
              Business Hours
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Opening Time
                </label>
                <Input
                  type="time"
                  value={opening}
                  onChange={e => setOpening(e.target.value)}
                  className="w-full text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Closing Time
                </label>
                <Input
                  type="time"
                  value={closing}
                  onChange={e => setClosing(e.target.value)}
                  className="w-full text-sm md:text-base"
                />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-3">
              Set your regular business hours.
            </p>
          </CardContent>
        </Card>

        {/* Break Times */}
        <Card className="border border-gray-200">
          <CardHeader>
            <h3 className="text-base md:text-lg font-semibold flex items-center">
              <AlertCircle className="mr-2" size={18} />
              Break Times
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Break Start
                </label>
                <Input
                  type="time"
                  value={breakStart}
                  onChange={e => setBreakStart(e.target.value)}
                  className="w-full text-sm md:text-base"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Break End
                </label>
                <Input
                  type="time"
                  value={breakEnd}
                  onChange={e => setBreakEnd(e.target.value)}
                  className="w-full text-sm md:text-base"
                />
              </div>
            </div>

            <Button
              onClick={handleAddBreak}
              className="mb-4 w-full sm:w-auto text-sm md:text-base"
              variant="outline"
            >
              Add Break
            </Button>

            {breaks.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Scheduled Breaks:
                </h4>
                <div className="space-y-2">
                  {breaks.map((breakTime, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50 p-3 rounded-md"
                    >
                      <span className="text-xs md:text-sm text-gray-600">
                        {breakTime.start} - {breakTime.end}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBreak(index)}
                        className="text-red-600 hover:text-red-700 text-xs md:text-sm w-full sm:w-auto"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs md:text-sm text-gray-500 mt-3">
              Add break times when you're not available for appointments.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 md:px-4 py-2.5 md:py-3 rounded-md text-xs md:text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="min-w-[120px] w-full sm:w-auto text-sm md:text-base"
            disabled={saved}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings; // Business settings

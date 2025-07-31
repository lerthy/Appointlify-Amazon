import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const Settings: React.FC = () => {
  const { businessSettings, updateBusinessSettings } = useApp();
  const [duration, setDuration] = useState('30 minutes');
  const [weekend, setWeekend] = useState({ saturday: false, sunday: false });
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

  useEffect(() => {
    if (businessSettings) {
      setDuration(businessSettings.appointment_duration ? `${businessSettings.appointment_duration} minutes` : '30 minutes');
      setWeekend({
        saturday: businessSettings.working_hours?.find((wh: any) => wh.day === 'Saturday')?.isClosed === false,
        sunday: businessSettings.working_hours?.find((wh: any) => wh.day === 'Sunday')?.isClosed === false
      });
      setOpening(businessSettings.working_hours?.[0]?.open || '09:00');
      setClosing(businessSettings.working_hours?.[0]?.close || '17:00');
      setBreaks(Array.isArray(businessSettings.breaks) ? businessSettings.breaks : []);
      setBlockedDates(businessSettings.blocked_dates || []);
    } else {
      // Set default values when businessSettings is null
      setDuration('30 minutes');
      setWeekend({ saturday: false, sunday: false });
      setOpening('09:00');
      setClosing('17:00');
      setBreaks([]);
      setBlockedDates([]);
    }
  }, [businessSettings]);

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
        isClosed: (day === 'Saturday' && !weekend.saturday) || (day === 'Sunday' && !weekend.sunday)
      }));

      // Save business settings, including appointment_duration
      let durationValue = 30;
      if (duration.includes('hour')) {
        const match = duration.match(/(\d+)/);
        if (match) durationValue = parseInt(match[1], 10) * 60;
      } else {
        const match = duration.match(/(\d+)/);
        if (match) durationValue = parseInt(match[1], 10);
      }

      const settingsToSave = {
        appointment_duration: durationValue,
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
      setError('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-gray-900">Appointment Settings</h2>
          <p className="text-gray-600">Configure your business hours and availability</p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-8">
            {/* Duration Settings */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="mr-2" size={20} />
                Appointment Duration
              </h3>
              <div className="flex gap-3">
                <Button 
                  variant={duration === '30 minutes' ? 'primary' : 'outline'} 
                  onClick={() => setDuration('30 minutes')}
                  className="flex-1"
                >
                  30 minutes
                </Button>
                <Button 
                  variant={duration === '1 hour' ? 'primary' : 'outline'} 
                  onClick={() => setDuration('1 hour')}
                  className="flex-1"
                >
                  1 hour
                </Button>
                <Button 
                  variant={duration === '2 hours' ? 'primary' : 'outline'} 
                  onClick={() => setDuration('2 hours')}
                  className="flex-1"
                >
                  2 hours
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This will be the default appointment duration when clients book with you.
              </p>
            </div>

            {/* Weekend Availability */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                Weekend Availability
              </h3>
              <div className="flex gap-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300"
                    checked={weekend.saturday}
                    onChange={e => setWeekend(w => ({ ...w, saturday: e.target.checked }))}
                  />
                  <span className="text-gray-700">Saturday</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300"
                    checked={weekend.sunday}
                    onChange={e => setWeekend(w => ({ ...w, sunday: e.target.checked }))}
                  />
                  <span className="text-gray-700">Sunday</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enable appointment booking on weekends.
              </p>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="mr-2" size={20} />
                Business Hours
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Time
                  </label>
                  <Input
                    type="time"
                    value={opening}
                    onChange={e => setOpening(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <Input
                    type="time"
                    value={closing}
                    onChange={e => setClosing(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Set your regular business hours.
              </p>
            </div>

            {/* Break Times */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertCircle className="mr-2" size={20} />
                Break Times
              </h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Start
                  </label>
                  <Input
                    type="time"
                    value={breakStart}
                    onChange={e => setBreakStart(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break End
                  </label>
                  <Input
                    type="time"
                    value={breakEnd}
                    onChange={e => setBreakEnd(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button
                onClick={handleAddBreak}
                className="mb-4"
                variant="outline"
              >
                Add Break
              </Button>

              {breaks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Scheduled Breaks:
                  </h4>
                  <div className="space-y-2">
                    {breaks.map((breakTime, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                      >
                        <span className="text-sm text-gray-600">
                          {breakTime.start} - {breakTime.end}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBreak(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-2">
                Add break times when you're not available for appointments.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="min-w-[120px]"
                disabled={saved}
              >
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings; // Business settings

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const Settings: React.FC = () => {
  const { businessSettings, updateBusinessSettings } = useApp();
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
      setError('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="space-y-6 md:space-y-8">
        {/* Weekend Availability */}
        <Card className="border border-gray-200">
          <CardHeader>
            <h3 className="text-base md:text-lg font-semibold flex items-center">
              <Calendar className="mr-2" size={18} />
              Weekend Availability
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300"
                  checked={weekend.saturday}
                  onChange={e => setWeekend(w => ({ ...w, saturday: e.target.checked }))}
                />
                <span className="text-sm md:text-base text-gray-700">Saturday</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300"
                  checked={weekend.sunday}
                  onChange={e => setWeekend(w => ({ ...w, sunday: e.target.checked }))}
                />
                <span className="text-sm md:text-base text-gray-700">Sunday</span>
              </label>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-3">
              Enable appointment booking on weekends.
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

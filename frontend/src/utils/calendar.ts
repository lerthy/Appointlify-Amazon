/**
 * Build a Google Calendar "Add event" URL for an appointment.
 * @param title - Event title (e.g. service name)
 * @param date - Date string YYYY-MM-DD
 * @param time - Time string HH:mm or HH:mm:ss
 * @param durationMinutes - Duration in minutes
 * @param location - Optional location string
 */
export function buildGoogleCalendarUrl(
  title: string,
  date: string,
  time: string,
  durationMinutes: number,
  location?: string
): string {
  const [y, m, d] = date.split('-').map(Number);
  const timePart = time.split(':').map(Number);
  const hours = timePart[0] ?? 0;
  const minutes = timePart[1] ?? 0;

  const start = new Date(y, (m ?? 1) - 1, d ?? 1, hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatUtc(start)}/${formatUtc(end)}`,
  });
  if (location) params.set('location', location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an .ics file content string for the appointment.
 */
export function buildIcsBlob(
  title: string,
  date: string,
  time: string,
  durationMinutes: number,
  location?: string
): string {
  const [y, m, d] = date.split('-').map(Number);
  const timePart = time.split(':').map(Number);
  const hours = timePart[0] ?? 0;
  const minutes = timePart[1] ?? 0;

  const start = new Date(y, (m ?? 1) - 1, d ?? 1, hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatIcs = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Appointlify//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatIcs(start)}`,
    `DTEND:${formatIcs(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Trigger download of an .ics file for the given appointment.
 */
export function downloadIcs(
  title: string,
  date: string,
  time: string,
  durationMinutes: number,
  location?: string,
  filename = 'appointment.ics'
): void {
  const ics = buildIcsBlob(title, date, time, durationMinutes, location);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

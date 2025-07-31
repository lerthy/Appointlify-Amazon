// Format time in 12-hour format (e.g., 2:30 PM)
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

// Format date in human-readable format (e.g., Monday, Jan 1, 2025)
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// Format date and time together (e.g., Mon, Jan 1 at 2:30 PM)
export const formatDatetime = (date: Date): string => {
  return `${date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })} at ${formatTime(date)}`;
};

// Format phone number as 044-111-555
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a 9-digit number
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Otherwise return the original
  return phone;
};

// Format wait time from minutes to human-readable format
export const formatWaitTime = (minutes: number): string => {
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 1) {
    if (remainingMinutes === 0) return '1 hour';
    if (remainingMinutes === 1) return '1 hour and 1 minute';
    return `1 hour and ${remainingMinutes} minutes`;
  }
  
  if (remainingMinutes === 0) return `${hours} hours`;
  if (remainingMinutes === 1) return `${hours} hours and 1 minute`;
  return `${hours} hours and ${remainingMinutes} minutes`;
};

// Generate a random 6-digit code for verification
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};// Form validation
// Form validation
// Form validation

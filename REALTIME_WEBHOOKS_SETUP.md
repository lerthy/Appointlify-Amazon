# Real-time Appointment Updates with Supabase Webhooks

## Overview

I've implemented Supabase real-time subscriptions so the calendar updates **instantly** when:
- A client books a new appointment
- An appointment status changes (confirmed, completed, cancelled, no-show)
- An appointment is deleted

This replaces the need for polling every 3 seconds - the calendar now updates in real-time using WebSocket connections.

## How It Works

### Architecture

```
Client Books Appointment
         ↓
Supabase Database (INSERT/UPDATE)
         ↓
Supabase Realtime Server (WebSocket)
         ↓
Business Dashboard (Instant Update)
         ↓
Calendar Refreshes Automatically
```

### What Was Changed

#### 1. **AppContext.tsx** - Real-time Subscription
Added a new `useEffect` hook that:
- Subscribes to the `appointments` table for the specific business
- Listens for INSERT, UPDATE, and DELETE events
- Automatically updates the local state when changes occur
- Properly cleans up the subscription on unmount

```typescript
// Real-time subscription for appointments
useEffect(() => {
  if (!businessId) return;
  
  const channel = supabase
    .channel(`appointments_${businessId}`)
    .on('postgres_changes', {
      event: '*', // Listen to all events
      schema: 'public',
      table: 'appointments',
      filter: `business_id=eq.${businessId}`
    }, (payload) => {
      // Handle INSERT, UPDATE, DELETE events
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [businessId]);
```

#### 2. **supabaseClient.ts** - Realtime Configuration
Updated the Supabase client to configure realtime parameters:
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

## Supabase Configuration Required

### Step 1: Enable Realtime in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Database** → **Replication**
4. Find the `appointments` table
5. **Enable Realtime** for the `appointments` table
6. Click **Save**

### Step 2: Configure Row Level Security (RLS)

For real-time to work properly, you need appropriate RLS policies:

```sql
-- Allow authenticated users to subscribe to appointments
CREATE POLICY "Allow realtime subscription for appointments"
ON appointments
FOR SELECT
TO authenticated
USING (true);

-- Or more restrictive - only allow business owners to see their appointments
CREATE POLICY "Business owners can see their appointments"
ON appointments
FOR SELECT
TO authenticated
USING (business_id = auth.uid());
```

### Step 3: Verify Realtime is Working

Open your browser's DevTools Console and look for:
```
[Realtime] Setting up appointment subscription for business: <business-id>
[Realtime] Subscription status: SUBSCRIBED
```

When a new appointment is booked, you should see:
```
[Realtime] Appointment change detected: { eventType: 'INSERT', ... }
[Realtime] New appointment: { id: '...', ... }
```

## Features

### 1. **Instant Updates**
- No more 3-second polling delay
- Calendar updates immediately when appointments are created
- Changes appear instantly across all open browser tabs/windows

### 2. **Event Handling**

**INSERT Events** (New Appointment):
- New appointment is added to the list
- List is automatically sorted by date
- Duplicate prevention ensures no duplicate entries

**UPDATE Events** (Status Change):
- Appointment status updates instantly
- "Complete", "No Show", "Confirm" buttons reflect changes immediately
- Badge colors update in real-time

**DELETE Events** (Cancelled Appointment):
- Removed appointments disappear from the calendar
- No manual refresh needed

### 3. **Multi-Tab Support**
- Changes are reflected across all open tabs of the dashboard
- If you have the calendar open in multiple windows, they all update simultaneously

### 4. **Connection Management**
- Automatically reconnects if connection is lost
- Proper cleanup when component unmounts
- Console logging for debugging

## Testing the Real-time Updates

### Test 1: Book an Appointment
1. Open the business dashboard in one browser tab
2. Open the customer booking page in another tab
3. Book a new appointment as a customer
4. Watch the business dashboard - the new appointment should appear **instantly**

### Test 2: Update Appointment Status
1. Open the dashboard in two browser tabs side-by-side
2. In one tab, click "Complete" on an appointment
3. Watch the other tab - the status should update immediately

### Test 3: Multi-Business
1. If you have multiple businesses, each has its own channel
2. Updates to Business A won't trigger updates in Business B's dashboard
3. Each subscription is filtered by `business_id`

## Debugging

### Check Subscription Status

In the browser console, you should see:
```javascript
[Realtime] Setting up appointment subscription for business: abc-123
[Realtime] Subscription status: SUBSCRIBED
```

If you see `CHANNEL_ERROR` or `TIMED_OUT`, check:
- Supabase Realtime is enabled for the `appointments` table
- RLS policies allow SELECT for authenticated users
- Your Supabase project has Realtime enabled (should be on by default)

### Test with SQL

You can test the real-time connection by manually inserting data:

```sql
-- Insert a test appointment
INSERT INTO appointments (
  business_id,
  customer_id,
  service_id,
  employee_id,
  date,
  status
) VALUES (
  'your-business-id',
  'test-customer-id',
  'test-service-id',
  'test-employee-id',
  NOW() + INTERVAL '1 day',
  'scheduled'
);
```

The appointment should appear in your dashboard instantly.

### Console Logging

All real-time events are logged with the `[Realtime]` prefix:
- Connection status
- New appointments
- Updated appointments
- Deleted appointments

You can filter console logs by typing "Realtime" in the DevTools filter.

## Performance

### Benefits:
- **Reduced Server Load**: No more polling every 3 seconds
- **Reduced Network Traffic**: Only sends data when changes occur
- **Better UX**: Instant updates feel more responsive
- **Battery Friendly**: WebSocket connections use less battery than polling

### Limits:
- Default: 10 events per second per connection
- Can be increased in Supabase settings if needed
- Each browser tab has its own connection

## Fallback Behavior

If Realtime fails:
1. Initial appointments are still loaded normally via REST API
2. Manual refresh still works
3. The `refreshAppointments()` function can be called manually
4. No breaking changes - existing functionality is preserved

## Environment Variables

No additional environment variables needed! Uses existing:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

## Deployment to Netlify

### Frontend
The real-time code is included in the frontend build automatically. No special configuration needed.

### Backend
Real-time connections bypass the backend API entirely - they connect directly to Supabase's realtime servers. This means:
- No backend changes required
- Works even if your Netlify functions are down
- More reliable and faster

## Troubleshooting

### Issue: No real-time updates

**Check 1: Supabase Realtime Enabled**
```sql
-- Check if realtime is enabled for appointments table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'appointments';
```

**Check 2: RLS Policies**
```sql
-- List all policies for appointments table
SELECT * FROM pg_policies WHERE tablename = 'appointments';
```

**Check 3: Browser Console**
Look for errors in console. Common issues:
- `WebSocket connection failed` - Firewall/proxy blocking WebSockets
- `CHANNEL_ERROR` - RLS policies too restrictive
- `TIMED_OUT` - Supabase project is paused or down

### Issue: Duplicate appointments appearing

This is prevented by checking if appointment already exists:
```typescript
if (prev.some(apt => apt.id === newAppointment.id)) {
  return prev; // Don't add duplicate
}
```

If duplicates still occur, check that your Supabase functions aren't creating multiple entries.

### Issue: Updates not showing across tabs

This is expected behavior for some browsers with aggressive battery saving. To test:
1. Open both tabs side-by-side
2. Check console logs in both tabs
3. Verify both show `SUBSCRIBED` status

## Future Enhancements

Potential additions:
1. **Toast notifications** when new appointments arrive
2. **Sound alerts** for urgent bookings
3. **Presence indicators** showing other team members viewing the calendar
4. **Typing indicators** if multiple people are editing the same appointment
5. **Conflict detection** if two people try to book the same time slot

## Security Notes

- Real-time subscriptions use the anon key (same as frontend)
- RLS policies enforce row-level security
- Each business only receives updates for their own appointments
- No sensitive data (like service role keys) exposed to frontend
- WebSocket connections are encrypted (WSS://)

## Summary

✅ Real-time updates implemented
✅ No more 3-second polling
✅ Instant calendar updates when clients book
✅ Works across multiple browser tabs
✅ Automatic reconnection on disconnect
✅ Filtered by business_id for security
✅ Comprehensive console logging for debugging
✅ Zero breaking changes - existing code still works

Just enable Realtime in your Supabase dashboard and you're good to go!


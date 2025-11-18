# Booking Slot Availability Fix

## Problem

Time slots were appearing as available in the booking form dropdown even when they were already booked. Users could select these slots and then get an error message "This time slot is already booked."

## Root Cause

The system was counting **ALL appointments** (including cancelled and no-show appointments) as "booked slots", which incorrectly blocked those time slots from being available.

### Example Scenario:
1. Customer books appointment at 10:00 AM
2. Customer cancels the appointment (status = 'cancelled')
3. The 10:00 AM slot was still showing as "booked" even though it should be available again

## Solution

Filter appointments to only include **active statuses** when checking for availability:
- ✅ `scheduled` - Appointment is booked but not confirmed
- ✅ `confirmed` - Appointment is confirmed
- ✅ `completed` - Appointment happened (for past dates)
- ❌ `cancelled` - Should NOT block the time slot
- ❌ `no-show` - Should NOT block the time slot

## Files Changed

### 1. Backend API - `appointmentsByDay` endpoint
**File:** `backend/netlify/functions/app.ts` (lines 770-799)

**Before:**
```typescript
let query = supabase!
  .from('appointments')
  .select('date, duration, employee_id, status')
  .eq('business_id', businessId)
  .gte('date', startOfDay.toISOString())
  .lte('date', endOfDay.toISOString());
```

**After:**
```typescript
const activeStatuses = ['scheduled', 'confirmed', 'completed'];

let query = supabase!
  .from('appointments')
  .select('date, duration, employee_id, status')
  .eq('business_id', businessId)
  .gte('date', startOfDay.toISOString())
  .lte('date', endOfDay.toISOString())
  .in('status', activeStatuses); // Only active appointments
```

### 2. Backend API - Create Appointment Duplicate Check
**File:** `backend/netlify/functions/app.ts` (lines 808-821)

**Before:**
```typescript
const { data: existing, error: existingErr } = await supabase!
  .from('appointments')
  .select('id')
  .eq('business_id', business_id)
  .gte('date', appointmentDate.toISOString())
  .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString());
```

**After:**
```typescript
const activeStatuses = ['scheduled', 'confirmed', 'completed'];
const { data: existing, error: existingErr } = await supabase!
  .from('appointments')
  .select('id, status')
  .eq('business_id', business_id)
  .eq('employee_id', employee_id)
  .gte('date', appointmentDate.toISOString())
  .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString())
  .in('status', activeStatuses); // Only check active appointments
```

**Additional improvements:**
- Added `employee_id` filter (more accurate - slot is only blocked for that specific employee)

### 3. Frontend - Appointment Form Duplicate Check
**File:** `frontend/src/components/customer/AppointmentForm.tsx` (lines 362-378)

**Before:**
```typescript
const { data: existingAppointments, error: checkError } = await supabase
  .from('appointments')
  .select('id, business_id, date')
  .eq('business_id', businessId)
  .gte('date', appointmentDate.toISOString())
  .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString());
```

**After:**
```typescript
const activeStatuses = ['scheduled', 'confirmed', 'completed'];
const { data: existingAppointments, error: checkError } = await supabase
  .from('appointments')
  .select('id, business_id, date, status, employee_id')
  .eq('business_id', businessId)
  .eq('employee_id', formData.employee_id)
  .gte('date', appointmentDate.toISOString())
  .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString())
  .in('status', activeStatuses); // Only check active appointments
```

**Additional improvements:**
- Added `employee_id` filter (slot blocking is employee-specific)

## Testing

### Test Case 1: Cancelled Appointment
1. Book appointment at 2:00 PM
2. Cancel the appointment
3. Try to book another appointment
4. ✅ 2:00 PM should appear in available time slots

### Test Case 2: No-Show Appointment
1. Book appointment at 3:00 PM
2. Mark it as "No Show"
3. Try to book another appointment
4. ✅ 3:00 PM should appear in available time slots

### Test Case 3: Active Appointment
1. Book appointment at 4:00 PM (status: scheduled)
2. Try to book another appointment
3. ❌ 4:00 PM should NOT appear in available time slots

### Test Case 4: Employee-Specific Blocking
1. Employee A has appointment at 5:00 PM
2. Try to book appointment with Employee B at 5:00 PM
3. ✅ 5:00 PM should be available for Employee B

## Benefits

1. **Better User Experience**
   - Users only see truly available time slots
   - No confusing error messages about already booked slots

2. **More Accurate Availability**
   - Cancelled appointments free up the time slot immediately
   - No-show appointments don't permanently block slots

3. **Employee-Specific Blocking**
   - Different employees can have appointments at the same time
   - More accurate slot availability per employee

4. **Consistent Logic**
   - Backend and frontend use the same status filtering
   - Reduces race conditions

## Status Definitions

| Status | Description | Blocks Time Slot? |
|--------|-------------|-------------------|
| `scheduled` | Newly booked, awaiting confirmation | ✅ Yes |
| `confirmed` | Business confirmed the appointment | ✅ Yes |
| `completed` | Appointment finished successfully | ✅ Yes (for historical accuracy) |
| `cancelled` | Customer or business cancelled | ❌ No |
| `no-show` | Customer didn't show up | ❌ No |

## Deployment Notes

After deploying these changes:
1. Clear any cached appointment data
2. Test booking flow with cancelled appointments
3. Verify time slots appear correctly in dropdown
4. Check that double-booking prevention still works

## Future Improvements

1. **Soft Delete** - Instead of keeping cancelled appointments, consider soft-deleting them
2. **Rescheduling** - Add ability to reschedule (change cancelled to scheduled)
3. **Buffer Time** - Add configurable buffer time between appointments
4. **Concurrent Booking Prevention** - Add optimistic locking to prevent race conditions



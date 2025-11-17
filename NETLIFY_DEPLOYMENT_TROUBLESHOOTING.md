# Netlify Deployment Troubleshooting Guide

## Issue: 500 Error on `/api/appointments/:id` endpoint

### Root Cause Analysis

The 500 error when clicking the "Complete", "Message", or "No Show" buttons is caused by the backend API failing to update appointment status. This typically happens due to one of these reasons:

### 1. **Missing Environment Variables** (Most Likely)

The backend requires these environment variables to be set in Netlify:

#### Required Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (with full database access)
- `FRONTEND_URL` or `CORS_ORIGINS` - Your frontend URL for CORS

#### How to Set Environment Variables in Netlify:

1. Go to your Netlify dashboard
2. Navigate to: **Site Settings** → **Environment Variables**
3. Add the following variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FRONTEND_URL=https://your-frontend-domain.netlify.app
```

4. **Important**: After adding environment variables, you MUST trigger a new deployment:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**

### 2. **Database Permissions**

Ensure your Supabase database has the correct permissions:

#### Check Row Level Security (RLS):
```sql
-- Disable RLS temporarily for testing (NOT recommended for production)
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Or create proper RLS policies:
CREATE POLICY "Allow service role full access" 
ON appointments 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
```

### 3. **API Function Configuration**

Verify your `netlify.toml` is configured correctly:

```toml
[build]
  command = "npm run build"
  publish = "frontend/dist"
  functions = "backend/netlify/functions"

[functions]
  node_bundler = "esbuild"
  
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## What I Changed to Help Debug

### Backend Changes (`backend/netlify/functions/app.ts`):

1. **Enhanced error logging** in the PATCH endpoint:
   - Now logs the request details (id, status, body)
   - Logs Supabase errors with full details
   - Returns more descriptive error messages

2. **Added validation** for the `status` field:
   - Returns 400 error if status is missing
   - Prevents cryptic 500 errors

3. **Returns updated data** after successful update:
   - Makes it easier to verify the update succeeded

### Frontend Changes (`frontend/src/context/AppContext.tsx`):

1. **Better error handling** in `updateAppointmentStatus`:
   - Logs all requests and responses
   - Catches and logs detailed error information
   - Throws errors instead of silently failing

2. **Console logging** to help debug:
   - Log when update starts
   - Log success with returned data
   - Log errors with full details

## How to Debug in Netlify

### Step 1: Check Netlify Function Logs

1. Go to **Functions** tab in Netlify dashboard
2. Click on the `api` function
3. View the real-time logs
4. Look for the `[PATCH /api/appointments/:id]` log entries

### Step 2: Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for:
- `[updateAppointmentStatus]` log entries
- Network errors
- CORS errors

### Step 3: Test the API Directly

Use curl or Postman to test the endpoint:

```bash
curl -X PATCH https://your-site.netlify.app/api/appointments/YOUR-APPOINTMENT-ID \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

Expected response:
```json
{
  "success": true,
  "appointment": { ...appointment data... }
}
```

## Common Error Messages and Solutions

### "Database not configured"
- **Cause**: Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
- **Solution**: Add environment variables and redeploy

### "Not allowed by CORS"
- **Cause**: Frontend URL not in CORS allowlist
- **Solution**: Add `CORS_ORIGINS` or `FRONTEND_URL` environment variable

### "Status is required"
- **Cause**: Request body is empty or malformed
- **Solution**: Check that the frontend is sending `{ "status": "completed" }` in the request body

### "Failed to update appointment"
- **Cause**: Database constraint violation or RLS policy blocking the update
- **Solution**: Check Supabase logs and RLS policies

## Mobile Button Issue (Already Fixed)

The buttons not working on mobile was a separate issue related to:
1. Complex responsive layout causing touch target issues
2. `overflow-hidden` on Card component clipping touch areas
3. Missing `touch-manipulation` CSS class

These have been fixed in:
- `frontend/src/components/business/AppointmentManagement.tsx`
- `frontend/src/components/ui/Card.tsx`

## Next Steps

1. **Add environment variables to Netlify** (most important)
2. **Trigger a new deployment** with cleared cache
3. **Test the buttons** - check both browser console and Netlify function logs
4. **If still failing**, share the error logs from:
   - Browser console
   - Netlify function logs
   - Supabase logs (if available)

## Quick Checklist

- [ ] Environment variables set in Netlify
- [ ] New deployment triggered after adding env vars
- [ ] Supabase RLS policies allow service role access
- [ ] `netlify.toml` has correct redirects
- [ ] Backend function is deploying successfully
- [ ] CORS is configured correctly
- [ ] Browser console shows detailed error logs
- [ ] Netlify function logs show request details


# Email Verification & Appointment Confirmation System

## Overview

This implementation adds comprehensive email verification for businesses and appointment confirmation for customers. The system ensures that:
1. Businesses must verify their email before they can log in
2. Customer appointments must be confirmed before appearing in the business dashboard
3. All tokens are secure, time-limited, and automatically cleaned up

## Database Changes

### Users Table (Business Email Verification)
- `email_verified` (boolean): Indicates if the business email has been verified
- `email_verification_token` (text): Secure token for email verification
- `email_verification_token_expires` (timestamp): Token expiration timestamp

### Appointments Table (Customer Confirmation)
- `confirmation_status` (enum: 'pending' | 'confirmed'): Customer confirmation status
- `confirmation_token` (text): Secure token for appointment confirmation
- `confirmation_token_expires` (timestamp): Token expiration timestamp

## Setup Instructions

### 1. Run the Database Migration

```bash
cd backend
node scripts/run-verification-migration.js
```

Alternatively, you can run the SQL manually in your Supabase SQL Editor:
```bash
backend/migrations/add_verification_fields.sql
```

### 2. Environment Variables

Ensure these environment variables are set in your `.env` files:

**Backend (.env):**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000  # or your production URL
BACKEND_URL=http://localhost:8888   # or your production URL
```

**Frontend (.env):**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Email Service Configuration

The system uses the existing email service. Ensure your email provider (SendGrid, AWS SES, etc.) is configured properly.

## How It Works

### Business Email Verification Flow

1. **Registration:**
   - Business registers with name, email, password
   - System generates secure verification token (64 char hex)
   - Token stored in database with 24-hour expiry
   - Verification email sent with link: `/verify-email?token=XXX`
   - `email_verified` set to `false`

2. **Login Attempt:**
   - System checks `email_verified` status
   - If `false`, login is blocked with message to verify email
   - If `true`, login proceeds normally

3. **Email Verification:**
   - Customer clicks verification link
   - Backend validates token and checks expiry
   - If valid, sets `email_verified = true` and clears token
   - User can now log in

### Appointment Confirmation Flow

1. **Appointment Creation:**
   - Customer fills out appointment form
   - System generates secure confirmation token (64 char hex)
   - Token stored in database with 48-hour expiry
   - `confirmation_status` set to `'pending'`
   - Confirmation email/SMS sent with link: `/confirm-appointment?token=XXX`

2. **Business Dashboard:**
   - Only shows appointments with `confirmation_status = 'confirmed'`
   - Pending appointments are hidden until confirmed
   - Can optionally show pending appointments with `?includeUnconfirmed=true`

3. **Customer Confirmation:**
   - Customer clicks confirmation link
   - Backend validates token and checks expiry
   - If valid, sets `confirmation_status = 'confirmed'` and `status = 'confirmed'`
   - Appointment now appears in business dashboard

## API Endpoints

### Email Verification

**GET** `/.netlify/functions/verify-email?token=XXX`
- Verifies business email
- Returns: success message or error

**POST** `/.netlify/functions/verify-email`
- Resends verification email
- Body: `{ "email": "business@example.com" }`
- Returns: success message (doesn't reveal if email exists)

### Appointment Confirmation

**GET** `/.netlify/functions/confirm-appointment?token=XXX`
- Confirms customer appointment
- Returns: success message with appointment details

**POST** `/.netlify/functions/confirm-appointment`
- Gets appointment details by token (without confirming)
- Body: `{ "token": "XXX" }`
- Returns: appointment details and confirmation status

### Appointments Query

**GET** `/api/business/:businessId/appointments?includeUnconfirmed=true`
- Gets business appointments
- By default, only returns confirmed appointments
- Add `?includeUnconfirmed=true` to include pending appointments

## Frontend Pages

### `/verify-email?token=XXX`
- Shows verification status (loading, success, error)
- Displays appropriate message and actions
- Redirects to login on success

### `/confirm-appointment?token=XXX`
- Shows appointment details
- Allows customer to confirm
- Displays confirmation status

## Security Features

1. **Secure Token Generation:**
   - Uses `crypto.randomBytes(32)` for cryptographically secure tokens
   - 64 character hexadecimal strings (256 bits of entropy)
   - Tokens are unique and unpredictable

2. **Time-Limited Tokens:**
   - Email verification: 24 hours
   - Appointment confirmation: 48 hours
   - Expired tokens are automatically rejected

3. **Token Cleanup:**
   - `cleanup_expired_tokens()` function removes expired tokens
   - Can be run manually or scheduled via cron

4. **Row Level Security (RLS):**
   - Policies allow public token-based verification
   - Users can only update their own data
   - Confirmation doesn't require authentication

## Token Cleanup

### Manual Cleanup
```sql
SELECT cleanup_expired_tokens();
```

### Automated Cleanup (with pg_cron)
```sql
SELECT cron.schedule(
  'cleanup-expired-tokens', 
  '0 * * * *',  -- Every hour
  'SELECT cleanup_expired_tokens();'
);
```

## Testing

### Test Business Registration
1. Register a new business
2. Check email for verification link
3. Try to log in (should be blocked)
4. Click verification link
5. Log in successfully

### Test Appointment Confirmation
1. Book an appointment as a customer
2. Check email for confirmation link
3. Check business dashboard (appointment should NOT appear)
4. Click confirmation link
5. Check business dashboard (appointment should NOW appear)

### Test Token Expiry
1. Generate a token
2. Manually update `token_expires` to past date in database
3. Try to use the token (should fail with expiry message)

## Migration for Existing Data

By default, the migration SQL includes commented-out lines to mark existing data as verified/confirmed:

```sql
-- Uncomment these lines if you want existing data to be automatically verified:
-- UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;
-- UPDATE appointments SET confirmation_status = 'confirmed' WHERE confirmation_status = 'pending';
```

**Decision Point:** Do you want existing businesses and appointments to:
- **Require verification:** Keep lines commented (strict security)
- **Auto-verify:** Uncomment lines (backward compatibility)

## Troubleshooting

### Businesses can't log in
- Check `email_verified` field in database
- Verify email service is working
- Check token hasn't expired
- Look for verification email in spam folder

### Appointments not showing in dashboard
- Check `confirmation_status` field
- Verify customer received confirmation email
- Check token hasn't expired
- Try adding `?includeUnconfirmed=true` to see pending appointments

### Tokens not working
- Verify token matches exactly (no extra characters)
- Check token expiration timestamp
- Ensure database migration ran successfully
- Check browser console for errors

## Production Considerations

1. **Email Deliverability:**
   - Use a professional email service (SendGrid, AWS SES)
   - Set up SPF, DKIM, DMARC records
   - Monitor bounce rates

2. **Rate Limiting:**
   - Add rate limiting to verification endpoints
   - Prevent spam/abuse of email sending

3. **Monitoring:**
   - Track verification conversion rates
   - Monitor token expiry rates
   - Alert on high failure rates

4. **User Experience:**
   - Clear error messages
   - Resend verification option
   - Support email for verification issues

## Future Enhancements

1. **SMS Verification:**
   - Add phone number verification
   - Two-factor authentication

2. **Reminder Emails:**
   - Send reminders if verification not completed
   - Remind customers to confirm appointments

3. **Admin Dashboard:**
   - View verification statistics
   - Manually verify businesses if needed
   - Monitor pending confirmations

4. **Flexible Confirmation:**
   - Optional appointment confirmation
   - Business-specific confirmation settings
   - Auto-confirm for trusted customers


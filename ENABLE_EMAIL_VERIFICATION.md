# 🔐 Enable Email Verification in Supabase

## ⚡ Quick Setup (5 minutes)

### Step 1: Run the Database Migration

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the contents of **`MIGRATION_TO_SUPABASE_AUTH.sql`**
5. Click **Run**

This adds the `auth_user_id` column to link your users table to Supabase Auth.

### Step 2: Enable Email Confirmation in Supabase

1. In your Supabase Dashboard, go to **Authentication** → **Settings**
2. Scroll down to **Email Auth**
3. Find **"Enable email confirmations"**
4. **Toggle it ON** ✅
5. Click **Save**

### Step 3: Configure Email Templates (Optional but Recommended)

1. In Authentication Settings, scroll to **Email Templates**
2. Click **Confirm signup**
3. Customize the email template if desired
4. The default template works fine for testing
5. **Important**: Make sure the confirmation link is enabled

### Step 4: Test It!

#### Test Registration & Email Verification:
1. Go to your app's registration page
2. Register with a NEW email address (not one you've used before)
3. Check your email inbox
4. You should receive a "Confirm Your Email" email from Supabase
5. Click the verification link
6. Try to login - it should work now! ✅

#### Test Login Without Verification:
1. Register another account but DON'T click the verification link
2. Try to login immediately
3. You should see: "Please verify your email address before logging in" ❌
4. This confirms email verification is working!

## 🔍 Troubleshooting

### Issue: Not receiving verification emails

**Solution:**
1. Check your spam/junk folder
2. In Supabase Dashboard → Authentication → Logs, check if email was sent
3. Verify your email service is configured in Authentication → Settings → SMTP Settings
4. For development, you can use Supabase's built-in email service

### Issue: "User already registered" error

**Solution:**
This happens if you try to register with an email that was used in the old custom auth system. You have two options:

**Option A: Use a different email for testing**
- Use a fresh email address

**Option B: Clean up test users**
```sql
-- In Supabase SQL Editor
DELETE FROM auth.users WHERE email = 'test@example.com';
DELETE FROM users WHERE email = 'test@example.com';
```

### Issue: Can login without verifying email

**Solution:**
1. Make sure you enabled "Enable email confirmations" in Authentication Settings
2. Make sure you clicked **Save** after enabling it
3. Try with a newly registered account (not existing ones)
4. Existing users from the old system may not require verification

### Issue: Verification link doesn't work

**Solution:**
1. Check that `emailRedirectTo` in registration matches your app URL
2. In Supabase Dashboard → Authentication → URL Configuration
3. Add your app URL to **Redirect URLs** list
4. Example: `http://localhost:3000/dashboard`

## 📊 Verify It's Working

### Check Email Confirmation is Enabled:
```sql
-- Run this in Supabase SQL Editor
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

- `email_confirmed_at` should be `NULL` for unverified users
- `email_confirmed_at` should have a timestamp for verified users

### Check User Profiles are Linked:
```sql
SELECT 
  u.id,
  u.email,
  u.name,
  u.auth_user_id,
  au.email_confirmed_at
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
ORDER BY u.created_at DESC
LIMIT 10;
```

- `auth_user_id` should be populated for all new users
- `email_confirmed_at` shows verification status

## 🎯 What Changed

### Before (Custom Auth):
- ❌ Passwords stored in `users` table
- ❌ Custom email verification tokens
- ❌ Manual email verification logic
- ❌ More code to maintain

### After (Supabase Auth):
- ✅ Passwords managed by Supabase Auth (more secure)
- ✅ Built-in email verification
- ✅ Automatic confirmation emails
- ✅ Less code to maintain
- ✅ Better security (bcrypt, rate limiting, etc.)

## 🔒 Security Benefits

1. **Secure Password Storage**: Supabase uses bcrypt with proper salting
2. **Rate Limiting**: Built-in protection against brute force attacks
3. **Email Verification**: Prevents fake accounts and spam
4. **JWT Tokens**: Secure session management
5. **Row Level Security**: Database-level access control

## 📝 Migration Notes

### For Existing Users:
- Old users with `password_hash` will need to re-register OR
- You can migrate them manually using Supabase Auth Admin API

### For New Users:
- All new registrations use Supabase Auth
- Email verification is **required** before login
- Profile is automatically created in `users` table

## ✅ Final Checklist

- [ ] Database migration completed
- [ ] Email confirmation enabled in Supabase settings
- [ ] Tested registration with new email
- [ ] Received verification email
- [ ] Cannot login before verifying
- [ ] Can login after verifying
- [ ] Appointment booking works
- [ ] Appointment confirmation still works

## 🎉 Success!

If all items are checked, your email verification is fully working with Supabase Auth!

**Benefits you now have:**
- ✅ Secure authentication with Supabase
- ✅ Required email verification
- ✅ Automatic confirmation emails
- ✅ Built-in security features
- ✅ Appointment confirmation (still working)
- ✅ Production-ready auth system

---

## 🆘 Still Having Issues?

If you're still having problems:
1. Check Supabase Dashboard → Authentication → Logs
2. Check browser console for errors
3. Verify database migration ran successfully
4. Make sure email confirmation is enabled
5. Try with a completely fresh email address


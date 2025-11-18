# 🚀 Deployment Checklist - Email Verification & Appointment Confirmation

## Pre-Deployment Steps

### 1. Database Setup
- [ ] Run database migration script: `node backend/scripts/run-verification-migration.js`
- [ ] Verify new columns exist in `users` table:
  - [ ] `email_verified`
  - [ ] `email_verification_token`
  - [ ] `email_verification_token_expires`
- [ ] Verify new columns exist in `appointments` table:
  - [ ] `confirmation_status`
  - [ ] `confirmation_token`
  - [ ] `confirmation_token_expires`
- [ ] Verify indexes were created successfully
- [ ] Test `cleanup_expired_tokens()` function

### 2. Environment Variables
- [ ] Backend `.env` has `SUPABASE_URL`
- [ ] Backend `.env` has `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Backend `.env` has `FRONTEND_URL`
- [ ] Backend `.env` has `BACKEND_URL`
- [ ] Frontend `.env` has `VITE_SUPABASE_URL`
- [ ] Frontend `.env` has `VITE_SUPABASE_ANON_KEY`
- [ ] Email service credentials configured

### 3. Code Verification
- [ ] No TypeScript errors in frontend
- [ ] No linter errors
- [ ] All new files committed to git
- [ ] Backend builds successfully
- [ ] Frontend builds successfully

### 4. Local Testing

#### Email Verification Flow
- [ ] Register new business account
- [ ] Receive verification email
- [ ] Email contains correct verification link
- [ ] Cannot login before verification
- [ ] Verification link works correctly
- [ ] Can login after verification
- [ ] Verification page shows success message

#### Appointment Confirmation Flow
- [ ] Create new appointment as customer
- [ ] Receive confirmation email
- [ ] Email contains correct confirmation link
- [ ] Appointment NOT visible in business dashboard (before confirmation)
- [ ] Confirmation link works correctly
- [ ] Appointment details display correctly
- [ ] Appointment becomes visible after confirmation
- [ ] Confirmation page shows success message

#### Token Expiry Testing
- [ ] Expired email verification tokens are rejected
- [ ] Expired confirmation tokens are rejected
- [ ] Error messages are clear and helpful

## Deployment Steps

### 1. Backend Deployment
- [ ] Deploy backend to production environment
- [ ] Verify all Netlify functions deployed:
  - [ ] `verify-email`
  - [ ] `confirm-appointment`
  - [ ] Updated `app.ts` with new endpoints
- [ ] Test backend health endpoint
- [ ] Check backend logs for errors

### 2. Frontend Deployment
- [ ] Build frontend: `npm run build`
- [ ] Deploy frontend to production
- [ ] Verify new routes accessible:
  - [ ] `/verify-email`
  - [ ] `/confirm-appointment`
- [ ] Check browser console for errors
- [ ] Test responsive design on mobile

### 3. Database Production Migration
- [ ] Backup production database
- [ ] Run migration on production database
- [ ] Verify migration completed successfully
- [ ] Check database logs for errors
- [ ] Test a few queries to ensure schema is correct

### 4. Email Service Verification
- [ ] Test email sending from production
- [ ] Verify emails not going to spam
- [ ] Check email templates render correctly
- [ ] Test links in emails work correctly
- [ ] Verify email delivery rate

## Post-Deployment Testing

### Critical Path Testing
- [ ] Register test business account in production
- [ ] Receive and verify email
- [ ] Login successfully after verification
- [ ] Create test appointment in production
- [ ] Receive confirmation email
- [ ] Confirm appointment
- [ ] Verify appointment appears in dashboard

### Edge Cases
- [ ] Try to use expired verification token
- [ ] Try to use expired confirmation token
- [ ] Try to verify already-verified email
- [ ] Try to confirm already-confirmed appointment
- [ ] Try to login without verification
- [ ] Try invalid/malformed tokens

### Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### Performance Testing
- [ ] Page load times acceptable
- [ ] Email delivery within 1 minute
- [ ] Token validation quick (<500ms)
- [ ] No database query timeouts

## Monitoring Setup

### Metrics to Track
- [ ] Email verification conversion rate
- [ ] Appointment confirmation rate
- [ ] Token expiry rate
- [ ] Email delivery success rate
- [ ] Average time to verify
- [ ] Average time to confirm

### Alerts to Configure
- [ ] High email bounce rate
- [ ] Low verification conversion
- [ ] Database errors
- [ ] Email service failures
- [ ] Slow token validation

### Logging
- [ ] Backend logs verification attempts
- [ ] Backend logs confirmation attempts
- [ ] Email sending logged
- [ ] Token expiry logged
- [ ] Errors logged with context

## Documentation

- [ ] Update API documentation
- [ ] Document new environment variables
- [ ] Update deployment guide
- [ ] Create troubleshooting guide
- [ ] Document for support team

## Rollback Plan

### If Issues Found
1. [ ] Identify the issue severity
2. [ ] If critical, prepare rollback:
   - [ ] Revert frontend deployment
   - [ ] Revert backend deployment
   - [ ] Do NOT revert database (use feature flags instead)
3. [ ] Communicate with team
4. [ ] Document the issue
5. [ ] Fix and redeploy

### Database Rollback (If Needed)
```sql
-- Disable verification requirement (emergency only)
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- Auto-confirm pending appointments (emergency only)
UPDATE appointments 
SET confirmation_status = 'confirmed' 
WHERE confirmation_status = 'pending';
```

## Support Preparation

### Common Issues & Solutions
- [ ] Document "email not received" solution
- [ ] Document "token expired" solution
- [ ] Document "can't login" solution
- [ ] Document "appointment not showing" solution
- [ ] Create FAQ for customers
- [ ] Create FAQ for businesses

### Support Team Training
- [ ] Train on email verification flow
- [ ] Train on appointment confirmation flow
- [ ] Train on manual verification (if needed)
- [ ] Share troubleshooting guide
- [ ] Share database queries for support

## Final Verification

### Business Owner Perspective
- [ ] Sign up flow is intuitive
- [ ] Verification email arrives quickly
- [ ] Verification process is smooth
- [ ] Can access dashboard after verification
- [ ] Dashboard shows only confirmed appointments
- [ ] Can see appointment details

### Customer Perspective
- [ ] Booking flow is unchanged
- [ ] Confirmation email arrives quickly
- [ ] Confirmation process is simple
- [ ] Confirmation page looks professional
- [ ] Can see appointment details

### Developer Perspective
- [ ] Code is clean and maintainable
- [ ] No technical debt introduced
- [ ] Security best practices followed
- [ ] Performance is acceptable
- [ ] Monitoring in place

## Go-Live Checklist

- [ ] All pre-deployment steps completed
- [ ] All deployment steps completed
- [ ] All post-deployment tests passed
- [ ] Monitoring configured
- [ ] Support team trained
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Documentation updated

## Post-Go-Live (First 24 Hours)

- [ ] Monitor error rates
- [ ] Check email delivery rates
- [ ] Verify conversion rates
- [ ] Watch for support tickets
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Address any issues immediately

## Post-Go-Live (First Week)

- [ ] Analyze verification conversion rate
- [ ] Analyze confirmation conversion rate
- [ ] Review support tickets
- [ ] Check for any patterns in issues
- [ ] Optimize based on data
- [ ] Consider improvements
- [ ] Plan future enhancements

---

## ✅ Ready to Deploy?

If you've checked all boxes above, you're ready to deploy! 🚀

**Last reminder before deployment:**
1. Backup your database
2. Have rollback plan ready
3. Monitor closely after deployment
4. Be ready to respond to issues quickly

**Good luck with your deployment!** 🎉


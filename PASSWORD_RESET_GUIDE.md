# Password Reset Implementation Guide

## 🔐 Overview

This document describes the secure password reset implementation that replaces the previous buggy version. The new implementation follows security best practices and provides a robust user experience.

## 🛡️ Security Features

### 1. Cryptographically Secure Tokens
- Uses `crypto.randomBytes(32)` instead of `Math.random()`
- 64-character hexadecimal tokens
- 1-hour expiration window
- One-time use enforcement

### 2. Rate Limiting
- Max 3 requests per email per 15-minute window
- Max 10 requests per IP per 15-minute window
- Prevents abuse and brute force attacks

### 3. Email Enumeration Protection
- Always returns success response regardless of email existence
- Prevents attackers from discovering valid email addresses
- Consistent response timing

### 4. Password Security
- Minimum 8 characters
- Must contain at least one letter and one number
- Bcrypt hashing with 12 salt rounds
- Frontend password strength indicator

### 5. Database Security
- Proper indexes for performance
- Cascade deletion on user removal
- Automatic token invalidation
- Cleanup of expired tokens

## 🔄 Flow Description

### 1. Password Reset Request
```
User enters email → Validation → Rate limit check → User lookup → 
Token generation → Email sent → Success response
```

### 2. Password Reset Completion
```
User clicks link → Token validation → Expiry check → Password validation → 
Hash generation → Database update → Token invalidation → Success
```

## 📁 Files Modified/Created

### Backend Functions
- `netlify/functions/request-password-reset.js` - **Completely rewritten**
- `netlify/functions/reset-password.js` - **Completely rewritten**
- `netlify/functions/cleanup-expired-tokens.js` - **New cleanup function**

### Frontend Components
- `src/pages/ForgotPasswordPage.tsx` - **Enhanced with validation and error handling**
- `src/pages/ResetPasswordPage.tsx` - **Enhanced with password strength meter**

### Database
- `password_reset_tokens` table (already existed) - **No changes needed**

### Testing
- `test-password-reset.js` - **New test script**

## 🔧 Configuration Required

### Environment Variables
```bash
# Required for Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for email sending
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
EMAILJS_PRIVATE_KEY=your_emailjs_private_key  # Preferred
# OR
EMAILJS_PUBLIC_KEY=your_emailjs_public_key    # Fallback

# Optional
SITE_URL=https://yourdomain.com  # For reset links
```

### EmailJS Template Variables
Your EmailJS template should include these variables:
- `{{reset_url}}` - The password reset link
- `{{email}}` - User's email address
- `{{user_name}}` - User's name
- `{{expires_in}}` - Token expiration time

## 🧪 Testing

### Manual Testing
1. Start your development server: `npm run dev`
2. Navigate to `/forgot-password`
3. Test with various email formats
4. Check rate limiting by submitting multiple requests
5. Test password reset with generated tokens

### Automated Testing
```bash
node test-password-reset.js
```

### Production Testing
```bash
TEST_BASE_URL=https://yourdomain.com node test-password-reset.js
```

## 🗂️ Database Maintenance

### Automatic Cleanup
The system automatically:
- Marks old tokens as used when new ones are created
- Validates expiry on every reset attempt
- Invalidates all user tokens after successful password reset

### Manual Cleanup (Optional)
```bash
# Call the cleanup function periodically
curl -X POST https://yourdomain.com/.netlify/functions/cleanup-expired-tokens
```

Or set up a cron job to call this endpoint daily.

## 🚨 Error Handling

### Frontend Errors
- Email validation errors
- Network connectivity issues
- Rate limiting messages
- Token expiration notices
- Password strength requirements

### Backend Errors
- Malformed requests (400)
- Rate limiting (429)
- Server errors (500)
- Invalid/expired tokens (400)

## 📧 Email Template Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Password Reset Request</title>
</head>
<body>
    <h2>Reset Your Password</h2>
    <p>Hello {{user_name}},</p>
    
    <p>We received a request to reset your password for your account associated with {{email}}.</p>
    
    <p>Click the link below to reset your password:</p>
    <p><a href="{{reset_url}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
    
    <p>This link will expire in {{expires_in}}.</p>
    
    <p>If you didn't request this password reset, you can safely ignore this email.</p>
    
    <p>Best regards,<br>Your App Team</p>
</body>
</html>
```

## 🔍 Monitoring

### Logs to Monitor
- Rate limit violations
- Failed email sends
- Invalid token attempts
- Password reset success/failure rates

### Metrics to Track
- Password reset request volume
- Reset completion rate
- Email delivery success rate
- Token expiration rate

## 🛠️ Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check EmailJS configuration
   - Verify API keys
   - Check EmailJS dashboard for delivery status

2. **Rate limiting too aggressive**
   - Adjust `MAX_REQUESTS_PER_EMAIL` and `MAX_REQUESTS_PER_IP`
   - Consider using Redis for distributed rate limiting

3. **Tokens not working**
   - Verify Supabase connection
   - Check token expiration times
   - Ensure proper URL encoding

4. **Database performance**
   - Monitor index usage
   - Run cleanup function regularly
   - Consider archiving old tokens

## 🚀 Production Considerations

1. **Use Redis for rate limiting** in multi-instance deployments
2. **Set up monitoring** for failed password resets
3. **Configure proper CORS** headers for your domain
4. **Use HTTPS** for all password reset links
5. **Set up email delivery monitoring**
6. **Consider implementing CAPTCHA** for additional protection

## 📝 Next Steps

1. Deploy and test in staging environment
2. Set up monitoring and alerting
3. Train support team on new error messages
4. Update user documentation
5. Consider implementing 2FA for enhanced security

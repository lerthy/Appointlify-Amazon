# 📧 Setup Email Template in Supabase

## 🚀 Quick Setup (2 minutes)

### Step 1: Copy the Template
1. Open `email-templates/confirm-signup.html`
2. Copy **ALL** the HTML code (Ctrl+A, Ctrl+C)

### Step 2: Add to Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Email Templates**
4. Click on **"Confirm signup"**
5. **Paste** the HTML code into the editor
6. Click **Save**

### Step 3: Test It!
1. Register a new account in your app
2. Check your email
3. You should see a beautiful, branded Appointly email! 🎉

## 📋 Template Features

### What's Included:
- ✅ **Branded Header** with Appointly name and gradient
- ✅ **Professional Design** with modern styling
- ✅ **Large CTA Button** "Verify Email Address"
- ✅ **Alternative Link** for users whose button doesn't work
- ✅ **Security Notice** about 24-hour expiration
- ✅ **"What's Next" Section** showing features
- ✅ **Professional Footer** with links
- ✅ **Mobile Responsive** (works on all devices)
- ✅ **High Deliverability** (no images, just emojis & HTML)

### Visual Design:
- 🎨 **Indigo/Purple Gradient** matching your brand
- 📱 **Mobile-First Design** (responsive)
- 💼 **Professional Look** that builds trust
- 🎯 **Clear Call-to-Action** (hard to miss the button)
- 🔒 **Security Elements** (builds confidence)

## 🎨 Customization (Optional)

### Change Colors:
Find these lines and replace with your brand colors:

```html
<!-- Primary Gradient -->
background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);

<!-- Replace #4F46E5 with your primary color -->
<!-- Replace #7C3AED with your secondary color -->
```

### Change Company Name:
Replace all instances of "Appointly" with your business name

### Add Logo:
Replace the emoji icon (📧) with your logo image:
```html
<!-- Find this line: -->
<span style="font-size: 40px;">📧</span>

<!-- Replace with: -->
<img src="YOUR_LOGO_URL" alt="Logo" style="width: 60px; height: 60px;" />
```

### Change Footer Links:
Update these links with your actual URLs:
```html
<a href="#" style="...">Support</a>
<a href="#" style="...">Privacy</a>
<a href="#" style="...">Terms</a>
```

## 📊 Other Email Templates

You can use the same design for other Supabase email templates:

### Magic Link Email:
- Go to **Email Templates** → **"Magic Link"**
- Use similar design, change title to "Sign in to Appointly"
- Change button text to "Sign In"

### Password Recovery:
- Go to **Email Templates** → **"Reset Password"**
- Use similar design, change title to "Reset Your Password"
- Change button text to "Reset Password"

### Email Change:
- Go to **Email Templates** → **"Change Email Address"**
- Use similar design, change title to "Confirm Email Change"
- Change button text to "Confirm New Email"

## ✅ Verification

After setting up, test it:

1. **Send Test Email:**
   - In Supabase Email Templates, there's usually a "Send Test" button
   - Or register a test account

2. **Check These Elements:**
   - [ ] Email arrives in inbox (not spam)
   - [ ] Design looks good on mobile
   - [ ] Button works and redirects correctly
   - [ ] Alternative link works
   - [ ] All text is readable
   - [ ] Branding looks professional

## 🎯 Tips for Better Deliverability

1. **No External Images**: Template uses emojis instead of images (better deliverability)
2. **Inline CSS**: All styles are inline (required for email)
3. **Table Layout**: Uses tables for maximum compatibility
4. **Plain Text Version**: Supabase auto-generates this
5. **SPF/DKIM**: Make sure these are set up in Supabase

## 🐛 Troubleshooting

### Email looks broken:
- Make sure you copied the **entire** HTML file
- Check if Supabase email editor has syntax errors
- Some email clients strip certain CSS

### Button doesn't work:
- Make sure `{{ .ConfirmationURL }}` is preserved exactly
- This is a Supabase variable, don't change it

### Not receiving emails:
- Check spam folder
- Verify email service is configured in Supabase
- Check Authentication → Logs for errors

## 📱 Preview

The email will look like this:

```
┌─────────────────────────────────────┐
│  [Purple Gradient Header]           │
│         Appointly                    │
│  Your Business Appointment Platform │
├─────────────────────────────────────┤
│                                      │
│           [Email Icon 📧]           │
│                                      │
│      Confirm Your Email             │
│                                      │
│   Welcome message with branding...  │
│                                      │
│   [Verify Email Address Button]     │
│                                      │
│   [Alternative Link Section]        │
│   [Security Notice]                 │
│                                      │
│   What's Next?                      │
│   📅     👥     📊                  │
│   Features grid                     │
│                                      │
├─────────────────────────────────────┤
│  [Footer with links]                │
│  Support | Privacy | Terms          │
│  © 2025 Appointly                   │
└─────────────────────────────────────┘
```

## 🎉 You're Done!

Your verification emails will now look professional and match your brand! 

**Next Steps:**
1. Set up other email templates (optional)
2. Test the full registration flow
3. Check analytics to see open rates

---

**Need more help?** Check Supabase docs for email customization: https://supabase.com/docs/guides/auth/auth-email-templates


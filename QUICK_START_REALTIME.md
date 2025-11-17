# Quick Start: Real-time Calendar Updates

## 🎯 Goal
Calendar updates instantly when a client books an appointment (no more 3-second polling).

## ⚡ Quick Setup (2 minutes)

### Step 1: Enable Realtime in Supabase
1. Go to https://app.supabase.com
2. Click your project
3. Go to **Database** → **Replication**
4. Find `appointments` table → Toggle **Enable Realtime** ON
5. Click **Save**

### Step 2: Test It
1. Open your business dashboard
2. Look for green badge at top-right saying "Live updates active"
3. Open booking page in another tab
4. Book an appointment
5. Watch it appear instantly in the dashboard! ✨

## ✅ That's It!

No code changes needed. No deployment required. Just enable Realtime in Supabase.

## 🔍 How to Verify It's Working

**Check 1: Visual Indicator**
- Green "Live updates active" badge appears at top-right
- Auto-hides after 3 seconds

**Check 2: Browser Console**
```
[Realtime] Setting up appointment subscription for business: <your-business-id>
[Realtime] Subscription status: SUBSCRIBED
```

**Check 3: Test Booking**
- Book appointment from another tab
- Should appear instantly (no 3-second wait)
- No page refresh needed

## 🐛 Troubleshooting

**Problem:** Green badge not showing
- **Fix:** Enable Realtime in Supabase (Step 1)

**Problem:** Console shows "CHANNEL_ERROR"
- **Fix:** Add RLS policy:
```sql
CREATE POLICY "Allow realtime subscription"
ON appointments FOR SELECT TO anon
USING (true);
```

**Problem:** Works locally but not on Netlify
- **Fix:** Check environment variables are set in Netlify
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📚 More Info

See these files for detailed documentation:
- `WEBHOOK_IMPLEMENTATION_SUMMARY.md` - Complete technical details
- `REALTIME_WEBHOOKS_SETUP.md` - Advanced configuration

## 🎉 Benefits

- ✅ Instant updates (no delay)
- ✅ 99% fewer network requests
- ✅ Works across multiple tabs
- ✅ Lower server costs
- ✅ Better user experience


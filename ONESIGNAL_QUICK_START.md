# OneSignal Quick Start - 5 Steps to Working Notifications

## What Changed?
✅ Switched from Firebase Messaging SDK to OneSignal
✅ Updated frontend to use `useOneSignalPush` hook
✅ Updated backend to send via OneSignal REST API
✅ No more "Failed to fetch" errors!

---

## Step 1: Create OneSignal Account (3 minutes)

1. Go to: **https://onesignal.com/**
2. Click "Get Started Free"
3. Sign up with email or Google
4. Click "New App/Website"
5. Enter:
   - **App Name**: `Hostel Ledger`
   - **Platform**: Web Push
6. Configure:
   - **Site URL**: `https://hostelledger.aarx.online`
   - **Auto Resubscribe**: ✅ Enable
   - **Icon**: Upload `/public/only-logo.png`
7. Click "Save"

---

## Step 2: Get Your Credentials (1 minute)

After creating the app, you'll see:

1. **App ID**: Copy this (looks like: `12345678-1234-1234-1234-123456789abc`)
2. **REST API Key**: 
   - Go to Settings → Keys & IDs
   - Copy "REST API Key"

---

## Step 3: Add Environment Variables (2 minutes)

### Frontend (.env)
Open `.env` and add:
```env
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

### Backend (backend-server/.env)
Open `backend-server/.env` and add:
```env
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

### Vercel (Backend)
1. Go to: https://vercel.com/dashboard
2. Select your backend project
3. Settings → Environment Variables
4. Add both:
   - `ONESIGNAL_APP_ID`
   - `ONESIGNAL_REST_API_KEY`
5. Click "Save"

---

## Step 4: Install OneSignal SDK (1 minute)

Run in your project root:
```bash
npm install react-onesignal
```

---

## Step 5: Deploy & Test (3 minutes)

### Deploy Frontend
```bash
npm run build
# Deploy to your hosting
```

### Deploy Backend
Redeploy to Vercel (it will pick up new env variables automatically)

### Test
1. Open: `https://hostelledger.aarx.online`
2. Go to: Profile → Notifications
3. Toggle "Push Notifications" ON
4. Click "Send Test Notification"
5. You should see a notification! 🎉

---

## Verify It's Working

### Check 1: Frontend Console
Open browser console, you should see:
```
✅ OneSignal initialized
```

### Check 2: Backend Health
Visit: `https://hostel-ledger-backend.vercel.app/health`

Should show:
```json
{
  "version": "4.0.0-onesignal",
  "pushProvider": "OneSignal",
  "oneSignalConfigured": true
}
```

### Check 3: Real Notification
1. Add an expense in a group
2. All members should receive notification
3. Check OneSignal dashboard for delivery stats

---

## Troubleshooting

### "OneSignal App ID not configured"
- Make sure `VITE_ONESIGNAL_APP_ID` is in `.env`
- Rebuild frontend: `npm run build`
- Clear browser cache

### "OneSignal not configured on server"
- Make sure both env variables are in `backend-server/.env`
- Redeploy backend to Vercel
- Check Vercel environment variables

### Notifications not received
- Check browser notification permissions
- Verify App ID is correct
- Check OneSignal dashboard → Delivery → Sent Notifications

---

## What's Next?

Once working:
1. ✅ Notifications work on all platforms (web, APK)
2. ✅ No more Firebase SDK errors
3. ✅ Better delivery rates
4. ✅ Built-in analytics in OneSignal dashboard
5. ✅ Can add notification sounds, images, actions

---

## Support

- **OneSignal Docs**: https://documentation.onesignal.com/docs/web-push-quickstart
- **OneSignal Dashboard**: https://app.onesignal.com/
- **Backend Logs**: https://vercel.com/dashboard (check logs)

---

## Summary

**Total Time**: ~10 minutes
**Difficulty**: Easy
**Result**: Working push notifications! 🎉

Just need to:
1. Create OneSignal account
2. Get App ID and REST API Key
3. Add to environment variables
4. Install SDK: `npm install react-onesignal`
5. Deploy and test

**All code is already updated and ready to go!**

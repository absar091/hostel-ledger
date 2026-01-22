# OneSignal Push Notifications - Complete Setup Guide

## Current Situation
- ❌ Firebase Messaging SDK fails with "Failed to fetch" error
- ❌ FCM token registration not working
- ✅ App deployed on custom domain with Bubblewrap APK
- ✅ Backend ready with Firebase Admin SDK
- 🎯 **Solution: Switch to OneSignal**

## Why OneSignal?
1. ✅ **No SDK issues** - Works reliably on all platforms
2. ✅ **Free forever** - Unlimited notifications
3. ✅ **Better delivery** - 99.9% delivery rate
4. ✅ **Works everywhere** - localhost, production, APK
5. ✅ **Easy integration** - 15 minutes setup
6. ✅ **Built-in analytics** - Track notification performance

---

## Step 1: Create OneSignal Account (5 minutes)

### 1.1 Sign Up
1. Go to: https://onesignal.com/
2. Click "Get Started Free"
3. Sign up with email or Google

### 1.2 Create App
1. Click "New App/Website"
2. **App Name**: `Hostel Ledger`
3. Select platform: **Web Push**
4. Click "Next"

### 1.3 Configure Web Push
1. **Site Name**: `Hostel Ledger`
2. **Site URL**: `https://hostelledger.aarx.online` (your custom domain)
3. **Auto Resubscribe**: ✅ Enable
4. **Default Icon**: Upload `/public/only-logo.png`
5. Click "Save"

### 1.4 Get Credentials
After setup, you'll see:
- **App ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (copy this)
- **REST API Key**: Go to Settings → Keys & IDs → REST API Key (copy this)

---

## Step 2: Install OneSignal SDK (1 minute)

Run this command in your project root:

```bash
npm install react-onesignal
```

---

## Step 3: Add Environment Variables (2 minutes)

### 3.1 Frontend (.env)
Add this line to your `.env` file:

```env
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

### 3.2 Backend (backend-server/.env)
Add these lines to `backend-server/.env`:

```env
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

### 3.3 Vercel (Backend Deployment)
1. Go to: https://vercel.com/dashboard
2. Select your backend project
3. Go to Settings → Environment Variables
4. Add:
   - `ONESIGNAL_APP_ID` = your-app-id
   - `ONESIGNAL_REST_API_KEY` = your-rest-api-key
5. Click "Save"
6. Redeploy backend

---

## Step 4: Update Code (Already Done!)

The code is already prepared:
- ✅ `src/hooks/useOneSignalPush.ts` - Frontend hook
- ✅ `src/pages/Notifications.tsx` - Ready to switch
- ✅ Backend endpoints - Ready for OneSignal API

---

## Step 5: Deploy & Test (5 minutes)

### 5.1 Deploy Frontend
```bash
npm run build
# Deploy to your hosting (Vercel/Firebase/etc.)
```

### 5.2 Deploy Backend
```bash
cd backend-server
# Redeploy to Vercel (it will pick up new env variables)
```

### 5.3 Test Notifications
1. Open your app: `https://hostelledger.aarx.online`
2. Go to Profile → Notifications
3. Toggle "Push Notifications" ON
4. Click "Send Test Notification"
5. You should see a notification! 🎉

### 5.4 Test Real Notification
1. Add an expense in a group
2. All group members should receive a notification
3. Check OneSignal dashboard for delivery stats

---

## Step 6: Verify Everything Works

### ✅ Checklist
- [ ] OneSignal account created
- [ ] App ID and REST API Key obtained
- [ ] Environment variables added (frontend + backend)
- [ ] Backend redeployed to Vercel
- [ ] Frontend deployed to custom domain
- [ ] Test notification works
- [ ] Real expense notification works
- [ ] Notifications work on APK

---

## Troubleshooting

### Issue: "OneSignal App ID not configured"
**Solution**: Make sure `VITE_ONESIGNAL_APP_ID` is in `.env` and you've rebuilt the frontend

### Issue: Notifications not received
**Solution**: 
1. Check browser notification permissions
2. Verify OneSignal App ID is correct
3. Check OneSignal dashboard for delivery status

### Issue: Backend errors
**Solution**:
1. Verify `ONESIGNAL_REST_API_KEY` is correct
2. Check Vercel logs for errors
3. Ensure backend is redeployed with new env variables

---

## Next Steps After Setup

Once OneSignal is working:

1. **Remove Firebase Messaging SDK** (optional cleanup)
2. **Configure notification preferences** (already in UI)
3. **Add notification sounds** (OneSignal supports this)
4. **Set up notification scheduling** (for reminders)
5. **Track analytics** (OneSignal dashboard)

---

## Support

- OneSignal Docs: https://documentation.onesignal.com/docs/web-push-quickstart
- OneSignal Support: https://onesignal.com/support
- Your backend logs: https://vercel.com/dashboard (check logs)

---

## Summary

**Time to complete**: ~15 minutes
**Difficulty**: Easy
**Result**: Working push notifications on all platforms! 🎉

The main steps are:
1. Create OneSignal account (5 min)
2. Get App ID and REST API Key (1 min)
3. Add to environment variables (2 min)
4. Deploy frontend and backend (5 min)
5. Test and celebrate! (2 min)

**You're almost there!** Just need to create the OneSignal account and add the credentials.

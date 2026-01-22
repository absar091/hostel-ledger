# ⚡ Add OneSignal to Vercel - DO THIS NOW

## Your OneSignal Credentials ✅

**App ID**: `f38c6f83-c20a-44c8-98a1-6a2571ad351f`

**REST API Key**: `os_v2_app_6ogg7a6cbjcmrgfbnisxdljvd4upxhdxdlcul643qo2fcwbamdaspfhu2xu3cvikp4apvijzyprui63vzq2wbcsz6ipybo6ujcrmoui`

---

## Add to Vercel (2 minutes)

### Step 1: Go to Vercel Dashboard
🔗 **https://vercel.com/dashboard**

### Step 2: Select Your Backend Project
Click on your backend project (the one that hosts the API)

### Step 3: Go to Settings
Click **"Settings"** tab at the top

### Step 4: Click Environment Variables
In the left sidebar, click **"Environment Variables"**

### Step 5: Add These Two Variables

**Variable 1:**
- **Name**: `ONESIGNAL_APP_ID`
- **Value**: `f38c6f83-c20a-44c8-98a1-6a2571ad351f`
- Click "Add"

**Variable 2:**
- **Name**: `ONESIGNAL_REST_API_KEY`
- **Value**: `os_v2_app_6ogg7a6cbjcmrgfbnisxdljvd4upxhdxdlcul643qo2fcwbamdaspfhu2xu3cvikp4apvijzyprui63vzq2wbcsz6ipybo6ujcrmoui`
- Click "Add"

### Step 6: Redeploy
After adding both variables:
1. Go to **"Deployments"** tab
2. Click the three dots (...) on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

---

## Local Files Updated ✅

I've already added the credentials to:
- ✅ `.env` (frontend)
- ✅ `backend-server/.env` (backend)
- ✅ `react-onesignal` SDK installed

---

## Next Steps

### 1. Build Frontend
```bash
npm run build
```

### 2. Deploy Frontend
Deploy to your hosting (Vercel/Firebase/etc.)

### 3. Test Notifications

1. Open your app: `https://app.hostelledger.aarx.online`
2. Go to: **Profile → Notifications**
3. Toggle **"Push Notifications"** ON
4. Click **"Send Test Notification"**
5. You should see a notification! 🎉

### 4. Test Real Notification
1. Add an expense in a group
2. All members should receive notification
3. Check OneSignal dashboard for delivery stats

---

## Verify Backend is Working

Visit: `https://hostel-ledger-backend.vercel.app/health`

Should show:
```json
{
  "version": "4.0.0-onesignal",
  "pushProvider": "OneSignal",
  "oneSignalConfigured": true
}
```

---

## Summary

✅ OneSignal credentials added to local files
✅ SDK installed
⏳ **NOW: Add to Vercel and redeploy**
⏳ **THEN: Build and deploy frontend**
⏳ **FINALLY: Test notifications**

**You're almost done! Just add to Vercel and deploy!** 🚀

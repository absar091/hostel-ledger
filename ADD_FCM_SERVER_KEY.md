# Add FCM Server Key to Vercel

## Problem
Push notifications are failing with error: "Authorization header must be specified: unauthenticated"

This is because FCM endpoints require the FCM Server Key (also called Cloud Messaging Server Key) to authorize push notifications.

## Solution

### Step 1: Get FCM Server Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/hostel-ledger/settings/cloudmessaging)
2. Click on your project: **hostel-ledger**
3. Go to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Look for **Cloud Messaging API (Legacy)** section
5. If you see "Cloud Messaging API (Legacy) is disabled", click **Enable**
6. Copy the **Server key** (it starts with `AAAA...`)

### Step 2: Add to Backend .env File (for local testing)

Add this line to `backend-server/.env`:

```
FCM_SERVER_KEY=YOUR_SERVER_KEY_HERE
```

### Step 3: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your backend project: **hostel-ledger-backend**
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Your FCM Server Key (the one you copied)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 4: Redeploy Backend

After adding the environment variable, you need to redeploy:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **⋯** menu → **Redeploy**
4. Or just push a new commit to trigger automatic deployment

## Verification

After redeployment, check the Vercel logs. You should see:
```
✅ FCM Server Key configured
```

Instead of:
```
⚠️ FCM_SERVER_KEY not set - FCM push notifications may fail
```

## Test Push Notifications

1. Refresh your app
2. Enable push notifications
3. Add an expense
4. You should receive a push notification! 🎉

---

**Note**: If Cloud Messaging API (Legacy) is not available, you may need to enable it in Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **hostel-ledger**
3. Enable **Firebase Cloud Messaging API**

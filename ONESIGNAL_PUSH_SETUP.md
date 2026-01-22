# OneSignal Push Notifications Setup

OneSignal is a free, reliable push notification service that works perfectly with web apps and Android APKs.

## Why OneSignal?

- ✅ Free for unlimited notifications
- ✅ Works on custom domains and APKs
- ✅ No Firebase SDK issues
- ✅ Easy to integrate
- ✅ Better delivery rates
- ✅ Built-in analytics

## Setup Steps

### 1. Create OneSignal Account

1. Go to https://onesignal.com/
2. Sign up for free
3. Click "New App/Website"
4. Enter app name: "Hostel Ledger"
5. Select "Web Push" platform

### 2. Configure Web Push

1. **Site URL**: Enter your domain (e.g., `https://hostelledger.aarx.online`)
2. **Auto Resubscribe**: Enable
3. **Default Notification Icon**: Upload `/only-logo.png`
4. Click "Save"

### 3. Get Your App ID

After setup, you'll see:
- **App ID**: Copy this (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **REST API Key**: Copy this too

### 4. Add to Environment Variables

Add to `.env`:
```
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

Add to `backend-server/.env`:
```
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

Add to Vercel (backend):
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

### 5. Install OneSignal SDK

```bash
npm install react-onesignal
```

### 6. Code Integration

The code will be automatically integrated. Just:

1. Add environment variables
2. Redeploy frontend and backend
3. Test push notifications

### 7. Test

1. Go to your app
2. Enable notifications
3. Add an expense
4. Receive push notification! 🎉

## Advantages Over Firebase

- ✅ No "Failed to fetch" errors
- ✅ Works on localhost, production, and APK
- ✅ Better notification delivery
- ✅ Built-in notification center
- ✅ Segmentation and targeting
- ✅ A/B testing
- ✅ Analytics dashboard

## Next Steps

1. Create OneSignal account
2. Get App ID and REST API Key
3. Add to environment variables
4. I'll integrate the code
5. Deploy and test!

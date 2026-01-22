# 🚀 DEPLOY NOW - 3 Simple Steps

## ✅ Everything is Ready!

Your code is built and ready to deploy. Just follow these 3 steps:

---

## Step 1: Add to Vercel Backend (2 minutes)

### Go to Vercel
🔗 **https://vercel.com/dashboard**

### Add Environment Variables

Go to your backend project → Settings → Environment Variables

**Add Variable 1:**
```
Name:  ONESIGNAL_APP_ID
Value: f38c6f83-c20a-44c8-98a1-6a2571ad351f
```

**Add Variable 2:**
```
Name:  ONESIGNAL_REST_API_KEY
Value: os_v2_app_6ogg7a6cbjcmrgfbnisxdljvd4upxhdxdlcul643qo2fcwbamdaspfhu2xu3cvikp4apvijzyprui63vzq2wbcsz6ipybo6ujcrmoui
```

### Redeploy
Deployments tab → Click "Redeploy" on latest deployment

---

## Step 2: Deploy Frontend (5 minutes)

Your build is ready in the `dist` folder!

### Deploy Command
```bash
vercel --prod
```

Or upload the `dist` folder to your hosting.

---

## Step 3: Test (3 minutes)

### Open Your App
🔗 **https://app.hostelledger.aarx.online**

### Enable Notifications
1. Profile → Notifications
2. Toggle ON
3. Click "Allow" in browser
4. Click "Send Test Notification"
5. See notification! 🎉

### Test Real Notification
1. Add an expense
2. All members get notification
3. Check OneSignal dashboard

---

## Verify Backend

Visit: `https://hostel-ledger-backend.vercel.app/health`

Should show:
```json
{
  "pushProvider": "OneSignal",
  "oneSignalConfigured": true
}
```

---

## That's It!

**Total Time**: 10 minutes
**Result**: Working push notifications! 🎉

**Start with Step 1 now!** 👆

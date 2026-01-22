# 🚨 URGENT - Add OneSignal to Vercel Backend

## The Error
```
Access denied. Please include your API key
```

This means the backend doesn't have the OneSignal credentials yet.

---

## Fix Now (2 minutes)

### Step 1: Go to Vercel
🔗 **https://vercel.com/dashboard**

### Step 2: Select Backend Project
Click on your **backend project** (the one hosting the API at `hostel-ledger-backend.vercel.app`)

### Step 3: Go to Settings
Click **"Settings"** tab at the top

### Step 4: Environment Variables
Click **"Environment Variables"** in the left sidebar

### Step 5: Add These Variables

**Variable 1:**
```
Name:  ONESIGNAL_APP_ID
Value: f38c6f83-c20a-44c8-98a1-6a2571ad351f
```
Click "Add"

**Variable 2:**
```
Name:  ONESIGNAL_REST_API_KEY
Value: os_v2_app_6ogg7a6cbjcmrgfbnisxdljvd4upxhdxdlcul643qo2fcwbamdaspfhu2xu3cvikp4apvijzyprui63vzq2wbcsz6ipybo6ujcrmoui
```
Click "Add"

### Step 6: Redeploy
1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the three dots (...) menu
4. Click **"Redeploy"**
5. Wait for deployment to complete (~1 minute)

---

## Verify It Worked

### Check 1: Health Endpoint
Visit: `https://hostel-ledger-backend.vercel.app/health`

Should show:
```json
{
  "version": "4.0.0-onesignal",
  "pushProvider": "OneSignal",
  "oneSignalConfigured": true
}
```

If `oneSignalConfigured: false`, the variables weren't added correctly.

### Check 2: Test Notification
1. Go to your app
2. Add an expense
3. Should receive notification! 🎉

---

## Important Notes

- **Make sure you're adding to the BACKEND project**, not the frontend
- **Both variables are required** - add both
- **Redeploy after adding** - changes don't apply until redeployment
- **Wait for deployment to complete** - usually takes 1 minute

---

## Troubleshooting

### Still getting "Access denied"?
1. Check you added to the correct project (backend)
2. Check variable names are exact (case-sensitive)
3. Check you redeployed after adding
4. Check Vercel logs for errors

### Can't find backend project?
Look for the project with URL: `hostel-ledger-backend.vercel.app`

### Variables not showing?
Make sure you clicked "Add" after entering each variable

---

## Quick Checklist

- [ ] Go to Vercel dashboard
- [ ] Select backend project
- [ ] Settings → Environment Variables
- [ ] Add `ONESIGNAL_APP_ID`
- [ ] Add `ONESIGNAL_REST_API_KEY`
- [ ] Go to Deployments tab
- [ ] Redeploy latest deployment
- [ ] Wait for deployment to complete
- [ ] Test notification

---

## After Adding

Once redeployed, test immediately:
1. Open your app
2. Add an expense
3. You should receive notification! 🎉

**Do this now - it only takes 2 minutes!** 🚀

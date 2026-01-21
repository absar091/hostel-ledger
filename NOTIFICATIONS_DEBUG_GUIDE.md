# Push Notifications Debug Guide

## ✅ What's Already Implemented

1. **VAPID Keys** - Configured in `.env`:
   - `VITE_VAPID_PUBLIC_KEY` ✓
   - `VAPID_PRIVATE_KEY` ✓

2. **Service Worker** - `src/sw-custom.ts` with push notification handlers

3. **Push Notifications Hook** - `src/hooks/usePushNotifications.ts`

4. **Backend API** - `backend-server/server.js` with `/api/push-subscribe` endpoint

5. **New Pages Created**:
   - `/notifications` - Manage push notification settings
   - `/security` - Security and privacy settings

## 🔍 Common Issues & Solutions

### 1. Service Worker Not Registered

**Check:**
```javascript
// Open browser console and run:
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));
```

**Fix:**
- Make sure service worker is registered in `vite.config.ts`
- Check if PWA plugin is properly configured
- Clear cache and reload

### 2. VAPID Key Not Loading

**Check:**
```javascript
// In browser console:
console.log(import.meta.env.VITE_VAPID_PUBLIC_KEY);
```

**Fix:**
- Restart dev server after changing `.env`
- Make sure key starts with `VITE_` prefix
- Check `.env.production` for production builds

### 3. Permission Not Granted

**Check:**
- Go to `/notifications` page
- Look at permission status
- Browser settings → Site settings → Notifications

**Fix:**
- Click "Enable" on notifications page
- If blocked, reset in browser settings
- Try in incognito mode to test fresh

### 4. Backend Not Receiving Subscription

**Check Backend Logs:**
```bash
# If running locally:
cd backend-server
npm start

# Check console for subscription POST requests
```

**Fix:**
- Verify `VITE_API_URL` in `.env` points to correct backend
- Check CORS settings in `backend-server/server.js`
- Test backend endpoint manually:
```bash
curl -X POST https://hostel-ledger-backend.vercel.app/api/push-subscribe \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","subscription":{}}'
```

### 5. Notifications Not Showing

**Test Notification:**
1. Go to `/notifications` page
2. Enable notifications
3. Click "Send Test Notification"
4. Should see notification immediately

**If not working:**
- Check browser notification permissions
- Check if "Do Not Disturb" is enabled (mobile)
- Try different browser
- Check service worker console for errors

## 🧪 Testing Steps

### Step 1: Check Environment
```bash
# In project root:
cat .env | grep VAPID
# Should show both keys
```

### Step 2: Test Service Worker
1. Open DevTools → Application → Service Workers
2. Should see service worker registered
3. Check for errors in console

### Step 3: Test Push Subscription
1. Go to `/notifications`
2. Enable notifications
3. Open DevTools → Application → Storage → IndexedDB
4. Check for push subscription data

### Step 4: Test Backend
```bash
# Test backend is running:
curl https://hostel-ledger-backend.vercel.app/health
```

### Step 5: Send Test Notification
1. Go to `/notifications`
2. Click "Send Test Notification"
3. Should see notification

## 🐛 Debug Mode

The notifications page shows debug info in development mode:
- Supported: Browser capability
- Permission: Current permission status
- Subscribed: Whether user is subscribed
- VAPID Key: Whether key is configured

## 📱 Platform-Specific Issues

### iOS/Safari
- Push notifications require iOS 16.4+
- Must add to Home Screen first
- Limited support compared to Android

### Android/Chrome
- Full support for push notifications
- Works in browser and TWA
- Check battery optimization settings

### Desktop
- Works in Chrome, Edge, Firefox
- Check OS notification settings
- May need to allow in browser settings

## 🔧 Quick Fixes

### Reset Everything
```javascript
// Run in browser console:
// 1. Unregister service workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

// 2. Clear caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// 3. Reload
location.reload();
```

### Check Subscription Status
```javascript
// Run in browser console:
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

## 📝 Next Steps

1. **Test on Real Device**: Deploy and test on actual mobile device
2. **Check Backend Logs**: Monitor Vercel logs for backend errors
3. **Test Different Browsers**: Chrome, Firefox, Safari
4. **Check Firebase**: Ensure Firebase Cloud Messaging is set up if needed

## 🆘 Still Not Working?

1. Check browser console for errors
2. Check service worker console for errors
3. Check backend logs on Vercel
4. Test with simple notification first
5. Verify all environment variables are set
6. Try in incognito mode
7. Test on different device/browser

## 📚 Resources

- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

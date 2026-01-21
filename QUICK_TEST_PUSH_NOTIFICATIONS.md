# Quick Test: Push Notifications 🔔

## ✅ Prerequisites
- App built successfully (`npm run build`)
- VAPID keys configured in `.env`
- Browser supports push notifications (Chrome, Edge, Firefox)

## 🧪 Test 1: Check Service Worker

### Steps:
1. Run app: `npm run dev`
2. Open browser: `http://localhost:8080`
3. Open DevTools (F12)
4. Go to **Application** tab
5. Click **Service Workers** in left sidebar

### Expected Result:
```
✅ Service Worker: sw-custom.js
✅ Status: activated and is running
✅ Source: http://localhost:8080/sw-custom.js
```

---

## 🧪 Test 2: Request Notification Permission

### Steps:
1. Open app in browser
2. Install PWA (click install button or use browser menu)
3. Wait 2 seconds
4. Browser should show permission prompt

### Expected Result:
```
✅ Permission prompt appears
✅ Click "Allow"
✅ Toast: "Notifications enabled! 🔔"
```

### Manual Test (if auto-prompt doesn't work):
```javascript
// Open browser console and run:
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});
```

---

## 🧪 Test 3: Check Subscription

### Steps:
1. After granting permission
2. Open DevTools → Console
3. Run this code:

```javascript
navigator.serviceWorker.ready.then(async (registration) => {
  const subscription = await registration.pushManager.getSubscription();
  console.log('Subscription:', subscription);
  console.log('Endpoint:', subscription?.endpoint);
});
```

### Expected Result:
```
✅ Subscription object exists
✅ Endpoint URL present
✅ Keys (p256dh, auth) present
```

---

## 🧪 Test 4: Send Test Notification (DevTools)

### Steps:
1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Find your service worker
4. Click **Push** button
5. Notification should appear

### Expected Result:
```
✅ Notification appears on screen
✅ Title: "Test push message from DevTools"
✅ Click notification → app opens
```

---

## 🧪 Test 5: Test Offline Expense Sync Notification

### Steps:
1. Open app
2. Go offline: DevTools → Network → Offline
3. Add an expense
4. Go back online: Network → Online
5. Wait 1-2 seconds

### Expected Result:
```
✅ Toast: "Saved offline — will sync later"
✅ After going online: "Synced 1 offline expense"
✅ Notification: "Expense Synced"
✅ Body: "Your offline expense has been synced successfully!"
```

---

## 🧪 Test 6: Check Notification Click

### Steps:
1. Send a test notification (Test 4)
2. Click on the notification
3. App should open/focus

### Expected Result:
```
✅ Clicking notification opens app
✅ If app already open, brings to front
✅ Notification closes after click
```

---

## 🧪 Test 7: Check VAPID Key

### Steps:
1. Open browser console
2. Run:

```javascript
console.log('VAPID Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY);
```

### Expected Result:
```
✅ VAPID Key: BA8kEbuN2j6CGzLSzy3P1RKLUp-h5WM_BBmqWla6xMLrP4H2dgye8uKNMfUYPbhQXCgaQGktBRxOToQuRTKtqAE
```

---

## 🧪 Test 8: Test Periodic Sync (Chrome Only)

### Steps:
1. Open DevTools → Application → Service Workers
2. Look for **Periodic Background Sync** section
3. Should see: `check-expenses` tag

### Expected Result:
```
✅ Periodic sync registered
✅ Tag: check-expenses
✅ Interval: 24 hours
```

### Manual Trigger:
```javascript
// In console:
navigator.serviceWorker.ready.then(async (registration) => {
  if ('periodicSync' in registration) {
    await registration.periodicSync.register('check-expenses', {
      minInterval: 24 * 60 * 60 * 1000
    });
    console.log('Periodic sync registered!');
  }
});
```

---

## 🧪 Test 9: Test Background Sync

### Steps:
1. Go offline
2. Add expense
3. Check DevTools → Application → Background Sync
4. Should see: `expense-queue`

### Expected Result:
```
✅ Background sync registered
✅ Tag: expense-queue
✅ When online: auto-retries
```

---

## 🧪 Test 10: Production Test

### Steps:
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open: `http://localhost:4173`
4. Repeat Tests 1-9

### Expected Result:
```
✅ All tests pass in production build
✅ Service worker works
✅ Notifications work
✅ Background sync works
```

---

## 🐛 Troubleshooting

### Issue: Permission prompt doesn't appear
**Solution:**
```javascript
// Manually request in console:
Notification.requestPermission();
```

### Issue: Subscription fails
**Check:**
1. VAPID key in `.env`
2. Service worker registered
3. HTTPS or localhost (required for push)

### Issue: Notifications don't show
**Check:**
1. Permission granted: `Notification.permission === 'granted'`
2. Service worker active
3. Browser supports notifications

### Issue: Background sync doesn't work
**Note:** Background Sync only works in Chrome/Edge, not Firefox/Safari

### Issue: Periodic sync doesn't register
**Note:** Periodic Sync only works in Chrome/Edge with PWA installed

---

## 📊 Browser Support Check

### Run in Console:
```javascript
console.log({
  serviceWorker: 'serviceWorker' in navigator,
  pushManager: 'PushManager' in window,
  notifications: 'Notification' in window,
  backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
  periodicSync: 'periodicSync' in ServiceWorkerRegistration.prototype
});
```

### Expected (Chrome):
```javascript
{
  serviceWorker: true,
  pushManager: true,
  notifications: true,
  backgroundSync: true,
  periodicSync: true
}
```

---

## ✅ Success Checklist

After all tests:
- [ ] Service worker registered and active
- [ ] Notification permission granted
- [ ] Push subscription created
- [ ] Test notification received
- [ ] Notification click works
- [ ] Offline sync notification works
- [ ] Background sync registered
- [ ] Periodic sync registered (Chrome)
- [ ] VAPID key loaded correctly
- [ ] Production build works

---

## 🚀 Next: Backend Integration

Once all tests pass, integrate with backend:
1. Install `web-push` in backend
2. Create subscription endpoint
3. Send real notifications on events
4. Test end-to-end flow

See `VAPID_SETUP_COMPLETE.md` for backend setup guide.

---

## 📱 Mobile Testing

### Android Chrome:
1. Open app on phone
2. Install PWA
3. Grant notification permission
4. Test all scenarios

### iOS Safari (16.4+):
1. Add to Home Screen
2. Grant notification permission
3. Limited support - test carefully

---

## ✨ All Tests Passing?

Congratulations! 🎉 Your push notifications are working perfectly!

Now you can:
- Deploy to production
- Submit to app stores
- Send real notifications to users
- Monitor notification delivery

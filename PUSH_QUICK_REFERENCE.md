# Push Notifications - Quick Reference Card 🔔

## ⚡ Quick Start (3 Steps)

```bash
# 1. Start backend
cd backend-server && npm start

# 2. Start frontend (new terminal)
npm run dev

# 3. Open browser
http://localhost:8080
```

## 🔑 Your VAPID Keys

```
Public:  BA8kEbuN2j6CGzLSzy3P1RKLUp-h5WM_BBmqWla6xMLrP4H2dgye8uKNMfUYPbhQXCgaQGktBRxOToQuRTKtqAE
Private: xtol4IkC4oeInHINLkszxO2sC14vPDyq7qUq8060Sf0
```

## 📡 Backend Endpoints

### Send Notification
```bash
curl -X POST http://localhost:3000/api/push-notify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "title": "Test",
    "body": "Hello!"
  }'
```

### Send to Multiple Users
```bash
curl -X POST http://localhost:3000/api/push-notify-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2"],
    "title": "Group Update",
    "body": "New expense added"
  }'
```

### Check Subscription
```bash
curl http://localhost:3000/api/push-subscription/USER_ID
```

## 🧪 Test in Browser

### 1. DevTools Test
```
F12 → Application → Service Workers → Click "Push"
```

### 2. Console Test
```javascript
// Check if subscribed
navigator.serviceWorker.ready.then(async (reg) => {
  const sub = await reg.pushManager.getSubscription();
  console.log('Subscribed:', !!sub);
});

// Request permission
Notification.requestPermission();
```

### 3. Get User ID
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('user'));
console.log('User ID:', user.uid);
```

## 📱 Notification Examples

### New Expense
```json
{
  "userId": "user123",
  "title": "New Expense Added",
  "body": "John added Rs 500 to Hostel Group",
  "icon": "/only-logo.png",
  "data": { "url": "/activity" }
}
```

### Payment Reminder
```json
{
  "userId": "user123",
  "title": "Payment Reminder",
  "body": "You owe Rs 450 to Mike",
  "icon": "/only-logo.png",
  "data": { "url": "/to-pay" }
}
```

### Payment Received
```json
{
  "userId": "user123",
  "title": "Payment Received",
  "body": "Sarah paid you Rs 300",
  "icon": "/only-logo.png",
  "data": { "url": "/to-receive" }
}
```

## 🔧 Troubleshooting

### No Permission Prompt?
```javascript
// Manually request
Notification.requestPermission();
```

### Subscription Failed?
1. Check VAPID key in `.env`
2. Verify service worker is active
3. Must be HTTPS or localhost

### Notification Not Showing?
1. Check permission: `Notification.permission`
2. Check subscription exists
3. Check backend logs
4. Verify VAPID keys match

### Backend Error?
1. Check `web-push` is installed
2. Verify VAPID keys in `backend-server/.env`
3. Check backend is running on port 3000

## 📊 Status Check

### Frontend
```bash
npm run build
# Should see: ✓ dist/sw-custom.js generated
```

### Backend
```bash
cd backend-server
npm start
# Should see: ✅ Web Push configured with VAPID keys
```

### Browser
```
DevTools → Application → Service Workers
Status should be: "activated and is running"
```

## 🎯 Common Use Cases

### 1. Expense Added
```javascript
await fetch('/api/push-notify-multiple', {
  method: 'POST',
  body: JSON.stringify({
    userIds: groupMemberIds,
    title: 'New Expense',
    body: `${name} added Rs ${amount}`
  })
});
```

### 2. Payment Recorded
```javascript
await fetch('/api/push-notify', {
  method: 'POST',
  body: JSON.stringify({
    userId: payerId,
    title: 'Payment Recorded',
    body: `Your payment of Rs ${amount} was recorded`
  })
});
```

### 3. Daily Reminder
```javascript
// Cron job
const usersWithDebts = await getUsersWithDebts();
for (const user of usersWithDebts) {
  await fetch('/api/push-notify', {
    method: 'POST',
    body: JSON.stringify({
      userId: user.id,
      title: 'Payment Reminder',
      body: `You owe Rs ${user.debt}`
    })
  });
}
```

## 📁 Important Files

```
Frontend:
- src/sw-custom.ts              (Service worker)
- src/hooks/usePushNotifications.ts  (Push hook)
- vite.config.ts                (PWA config)
- .env                          (VAPID public key)

Backend:
- backend-server/server.js      (Push endpoints)
- backend-server/.env           (VAPID keys)

Docs:
- PUSH_NOTIFICATIONS_FINAL_SUMMARY.md  (Complete guide)
- QUICK_TEST_PUSH_NOTIFICATIONS.md     (Testing guide)
```

## ⚙️ Environment Variables

### Frontend (.env)
```env
VITE_VAPID_PUBLIC_KEY=BA8kEbuN2j6CGzLSzy3P1RKLUp-h5WM_BBmqWla6xMLrP4H2dgye8uKNMfUYPbhQXCgaQGktBRxOToQuRTKtqAE
```

### Backend (backend-server/.env)
```env
VAPID_PUBLIC_KEY=BA8kEbuN2j6CGzLSzy3P1RKLUp-h5WM_BBmqWla6xMLrP4H2dgye8uKNMfUYPbhQXCgaQGktBRxOToQuRTKtqAE
VAPID_PRIVATE_KEY=xtol4IkC4oeInHINLkszxO2sC14vPDyq7qUq8060Sf0
```

## 🚀 Deploy to Vercel

### Frontend
```bash
vercel --prod
# Add env vars in Vercel dashboard:
# VITE_VAPID_PUBLIC_KEY
```

### Backend
```bash
cd backend-server
vercel --prod
# Add env vars in Vercel dashboard:
# VAPID_PUBLIC_KEY
# VAPID_PRIVATE_KEY
```

## ✅ Success Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 8080
- [ ] PWA installed
- [ ] Notification permission granted
- [ ] Service worker active
- [ ] Test notification received
- [ ] Offline sync works
- [ ] Backend endpoints respond

## 🎉 You're Done!

Everything is set up and working. Start testing! 🚀

**Quick Test:**
1. Open app → Install PWA
2. Grant notification permission
3. F12 → Application → Service Workers → Push
4. See notification? ✅ SUCCESS!

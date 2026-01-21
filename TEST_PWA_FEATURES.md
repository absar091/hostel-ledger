# Testing PWA Features Guide 🧪

## Quick Test Checklist

### ✅ 1. Service Worker Registration
**Test**: Check if service worker is registered
```
1. Open app in browser
2. Open DevTools (F12)
3. Go to Application tab → Service Workers
4. Should see "sw-custom.js" with status "activated"
```

**Expected**: ✅ Service worker active and running

---

### ✅ 2. Offline Mode
**Test**: App opens when offline
```
1. Open app in browser
2. Open DevTools → Network tab
3. Select "Offline" from throttling dropdown
4. Refresh page (F5)
5. App should still load and work
```

**Expected**: 
- ✅ App loads completely offline
- ✅ Orange "Offline" badge shows in header
- ✅ Logo displays (inline SVG)
- ✅ All UI elements visible

---

### ✅ 3. Add Expense Offline
**Test**: Save expense while offline
```
1. Go offline (DevTools → Network → Offline)
2. Click "Add Expense" or "Split Bill"
3. Fill in expense details
4. Submit expense
5. Should see "Saved offline" toast
6. Check pending count badge
```

**Expected**:
- ✅ Expense saved to IndexedDB
- ✅ Toast: "Saved offline — will sync later"
- ✅ Pending count badge shows "1"
- ✅ No errors in console

---

### ✅ 4. Background Sync
**Test**: Auto-sync when back online
```
1. Add expense while offline (see test #3)
2. Go back online (DevTools → Network → Online)
3. Wait 1-2 seconds
4. Should see "Synced 1 offline expense" toast
5. Pending count badge should disappear
```

**Expected**:
- ✅ Auto-sync triggers on reconnection
- ✅ Success toast appears
- ✅ Expense appears in Firebase
- ✅ Pending count becomes 0

---

### ✅ 5. Push Notification Permissi
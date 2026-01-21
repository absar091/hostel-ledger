# Offline PWA Testing Guide

## Quick Test Steps

### 1. Test Online Mode (Baseline)
```bash
npm run dev
```
1. Open http://localhost:8080
2. Login to your account
3. Add an expense normally
4. Verify it appears in Firebase immediately
5. Check that all features work

### 2. Test Offline Mode

#### A. Go Offline
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh the page
5. **Expected:** App loads completely (no Chrome offline dinosaur!)

#### B. Add Expense Offline
1. Click "Add Expense" button
2. **Expected:** Orange "Offline Mode" badge appears in sheet
3. Fill out expense details:
   - Select group
   - Enter amount: Rs 500
   - Select who paid
   - Select participants
   - Add note: "Test offline expense"
4. Click "Add Expense"
5. **Expected:** Toast shows "Saved offline — will sync when online"
6. **Expected:** Orange offline badge in header shows pending count

#### C. Verify IndexedDB Storage
1. In DevTools, go to Application tab
2. Expand "IndexedDB"
3. Find "hostel-ledger-db"
4. Click "offline-expenses"
5. **Expected:** See your offline expense stored

#### D. Try Other Features (Should Be Blocked)
1. Try "Record Payment"
   - **Expected:** Toast "Internet required for recording payments"
2. Try "Create Group"
   - **Expected:** Toast "Internet required for creating groups"
3. Try "Add Money"
   - **Expected:** Should be blocked

### 3. Test Auto-Sync

#### A. Come Back Online
1. In DevTools Network tab, uncheck "Offline"
2. **Expected:** Toast "Back online! Syncing..."
3. **Expected:** Blue sync button appears briefly
4. **Expected:** After 1-2 seconds, toast "Synced 1 offline expense"
5. **Expected:** Pending count badge disappears
6. **Expected:** Expense appears in Firebase

#### B. Verify Sync
1. Check Activity page
2. **Expected:** Offline expense now appears
3. Check Firebase Console
4. **Expected:** Expense document exists
5. Check IndexedDB
6. **Expected:** offline-expenses store is empty

### 4. Test Multiple Offline Expenses

1. Go offline again
2. Add 3 different expenses
3. **Expected:** Pending count shows "3"
4. Come back online
5. **Expected:** "Synced 3 offline expenses"
6. **Expected:** All 3 appear in Activity

### 5. Test Manual Sync

1. Go offline
2. Add 2 expenses
3. Come back online BUT don't wait for auto-sync
4. Click the blue "Sync 2" button in header
5. **Expected:** Spinning icon during sync
6. **Expected:** "Synced 2 offline expenses"

### 6. Test Sync Failure (Advanced)

#### A. Simulate Network Error
1. Go offline
2. Add expense
3. In DevTools Console, run:
```javascript
// Block Firebase requests
const originalFetch = window.fetch;
window.fetch = () => Promise.reject(new Error('Network error'));
```
4. Come back online
5. **Expected:** Sync fails, expense stays in IndexedDB
6. **Expected:** syncAttempts increments

#### B. Restore and Retry
```javascript
// Restore fetch
window.fetch = originalFetch;
```
7. Click sync button again
8. **Expected:** Successful sync

### 7. Test PWA Installation

#### A. Desktop (Chrome)
1. Look for install icon in address bar
2. Click "Install Hostel Ledger"
3. **Expected:** App opens in standalone window
4. **Expected:** No browser UI visible
5. Test offline mode in installed app

#### B. Mobile (Android)
1. Open in Chrome mobile
2. Tap menu → "Add to Home screen"
3. **Expected:** Icon added to home screen
4. Open from home screen
5. **Expected:** Fullscreen app experience

### 8. Test Service Worker Caching

1. Load app online
2. Go to DevTools → Application → Service Workers
3. **Expected:** Service worker registered and activated
4. Go to Cache Storage
5. **Expected:** Multiple caches (workbox-precache, etc.)
6. Go offline
7. Navigate between pages
8. **Expected:** All pages load instantly from cache

## Expected Behaviors Summary

### ✅ When Online
- All features work
- No offline indicators
- Immediate Firebase sync
- Normal user experience

### ✅ When Offline
- App loads completely
- Orange offline badge visible
- Only Add Expense works
- Other features show error
- Expenses save to IndexedDB

### ✅ When Reconnecting
- Auto-sync starts immediately
- Toast notifications
- Pending count updates
- IndexedDB cleared after sync

### ✅ PWA Features
- Installs on desktop/mobile
- Works offline after install
- Updates automatically
- Standalone display mode

## Common Issues & Solutions

### Issue: App doesn't load offline
**Solution:** 
- Clear browser cache
- Rebuild: `npm run build`
- Check Service Worker is registered

### Issue: Offline expenses not syncing
**Solution:**
- Check Firebase rules allow writes
- Check network connection
- Look for errors in console
- Verify addExpense function works online

### Issue: Pending count not updating
**Solution:**
- Check IndexedDB in DevTools
- Verify updatePendingCount is called
- Check for console errors

### Issue: Service Worker not registering
**Solution:**
- Must use HTTPS or localhost
- Check vite-plugin-pwa is installed
- Clear Service Workers in DevTools
- Hard refresh (Ctrl+Shift+R)

## Performance Checks

### Load Time
- **First load:** < 3 seconds
- **Repeat load:** < 1 second (cached)
- **Offline load:** < 500ms

### IndexedDB Operations
- **Save expense:** < 50ms
- **Get expenses:** < 100ms
- **Delete expense:** < 50ms

### Sync Performance
- **1 expense:** < 2 seconds
- **10 expenses:** < 10 seconds
- **Network timeout:** 30 seconds

## Browser Compatibility

### ✅ Fully Supported
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+
- Chrome Android 90+
- Safari iOS 14+

### ⚠️ Limited Support
- IE 11: No Service Worker
- Opera Mini: No IndexedDB

## Production Testing

### Before Deploy
- [ ] Test on Chrome desktop
- [ ] Test on Chrome mobile
- [ ] Test on Safari iOS
- [ ] Test offline mode
- [ ] Test sync functionality
- [ ] Test PWA installation
- [ ] Check Lighthouse score (should be 90+)

### After Deploy
- [ ] Test on production URL
- [ ] Verify HTTPS works
- [ ] Test PWA installation from production
- [ ] Check Service Worker on production
- [ ] Test offline mode on production
- [ ] Submit to PWABuilder

## Lighthouse Audit

Run Lighthouse audit:
1. Open DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"

**Expected Scores:**
- PWA: 100
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

## Next Steps

1. ✅ Test all scenarios above
2. ✅ Fix any issues found
3. ✅ Deploy to Vercel
4. ✅ Test on production
5. ✅ Submit to Play Store via PWABuilder

---

**Happy Testing! 🚀**

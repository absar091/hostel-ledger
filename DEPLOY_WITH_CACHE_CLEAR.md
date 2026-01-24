# Deploy with Cache Clear - OneSignal Fix 🚀

## Current Issue

The OneSignal service worker files are now in the build, but the **old cached version** is still being served. You're seeing the error because:

1. ✅ Files are in the new build (`dist/OneSignalSDK.sw.js`, `dist/OneSignalSDKWorker.js`)
2. ❌ Browser/CDN is serving old cached version without these files
3. ❌ OneSignal tries to load from CDN as fallback

## Solution: Force Cache Clear on Deployment

### Step 1: Update Service Worker Version

This will force all clients to update their cache.

**File**: `src/sw-custom.ts`

Add this at the top:
```typescript
// Increment this version to force cache update
const CACHE_VERSION = 'v2';
```

### Step 2: Deploy to Vercel

```bash
# Commit all changes
git add .
git commit -m "fix: add OneSignal worker files and force cache update"
git push

# Vercel will auto-deploy
```

### Step 3: Clear Vercel Edge Cache (IMPORTANT!)

After deployment, clear Vercel's edge cache:

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/your-project
2. Click "Deployments"
3. Click on latest deployment
4. Click "..." menu → "Redeploy"
5. Check "Use existing Build Cache" = OFF
6. Click "Redeploy"

**Option B: Via Vercel CLI**
```bash
vercel --prod --force
```

### Step 4: Clear Browser Cache on Your Device

**On Mobile (Chrome/Safari)**:
1. Open DevTools (if possible) or
2. Settings → Privacy → Clear Browsing Data
3. Select "Cached images and files"
4. Clear data
5. Close and reopen browser
6. Visit app again

**On Desktop**:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Or: Application → Clear Storage → Clear site data

### Step 5: Unregister Old Service Workers

**In DevTools**:
1. Open DevTools → Application → Service Workers
2. Click "Unregister" on all service workers
3. Close DevTools
4. Refresh page
5. New service workers will register

## Verification Steps

### 1. Check Files Are Deployed
Visit these URLs directly:
- https://app.hostelledger.aarx.online/OneSignalSDK.sw.js
- https://app.hostelledger.aarx.online/OneSignalSDKWorker.js

**Expected**: Both should load (not 404)

### 2. Check Service Worker Registration
1. Open DevTools → Application → Service Workers
2. Should see:
   - `sw-custom.js` (your PWA worker)
   - `OneSignalSDK.sw.js` or `OneSignalSDKWorker.js` (OneSignal)
3. No errors in console

### 3. Check Console Logs
Should see:
```
✅ OneSignal initialized
📊 OneSignal status: {permission: true, isSubscribed: true}
```

Should NOT see:
```
❌ Failed to register a ServiceWorker: The origin of the provided scriptURL...
```

## Alternative: Add Cache-Control Headers

If the issue persists, add cache-control headers to prevent caching of service workers.

**File**: `vercel.json`

Add this:
```json
{
  "headers": [
    {
      "source": "/(OneSignalSDK\\.sw\\.js|OneSignalSDKWorker\\.js|sw-custom\\.js)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

This ensures service workers are never cached and always fresh.

## Quick Fix Script

Create this file to automate the process:

**File**: `force-deploy.bat`
```batch
@echo off
echo 🚀 Force deploying with cache clear...
echo.

echo 📦 Building...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo 📤 Committing and pushing...
git add .
git commit -m "fix: force cache update for OneSignal workers"
git push

echo.
echo ✅ Pushed to Git!
echo.
echo 🌐 Vercel will auto-deploy in ~30 seconds
echo.
echo ⚠️  IMPORTANT: After deployment completes:
echo    1. Go to Vercel dashboard
echo    2. Redeploy with "Use existing Build Cache" = OFF
echo    3. Clear browser cache on your device
echo    4. Unregister old service workers in DevTools
echo.
pause
```

Run it:
```bash
./force-deploy.bat
```

## Why This Happens

### Service Worker Caching
- Service workers are aggressively cached by browsers
- Even with new deployment, old SW might still be active
- Need to force update to get new files

### CDN/Edge Caching
- Vercel caches files at edge locations
- Old files might be served from cache
- Need to purge edge cache

### Browser Cache
- Browser caches service worker files
- Need to clear browser cache
- Or wait 24 hours for natural expiration

## Prevention for Future

### 1. Version Your Service Worker
Always increment version when making SW changes:
```typescript
const CACHE_VERSION = 'v3'; // Increment this
```

### 2. Set Proper Cache Headers
Service workers should have short cache times:
```
Cache-Control: public, max-age=0, must-revalidate
```

### 3. Test Locally First
Before deploying:
```bash
npm run build
npm run preview
```
Test in preview mode to catch issues.

## Current Status

- ✅ Files added to build (OneSignalSDK.sw.js, OneSignalSDKWorker.js)
- ✅ Files included in vite.config.ts
- ✅ Build successful (32 files precached)
- ⏳ Waiting for deployment + cache clear
- ⏳ Waiting for browser cache clear

## Expected Timeline

1. **Deploy** → 1-2 minutes
2. **Edge cache propagation** → 5-10 minutes
3. **Browser cache clear** → Immediate (manual)
4. **Service worker update** → 1-2 minutes after page refresh

**Total**: ~10-15 minutes for full propagation

## Troubleshooting

### If Error Persists After All Steps

1. **Check file exists**:
   ```
   curl https://app.hostelledger.aarx.online/OneSignalSDK.sw.js
   ```
   Should return file content, not 404

2. **Check service worker scope**:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     console.log('Registered SWs:', registrations);
   });
   ```

3. **Force unregister all**:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

4. **Check OneSignal dashboard**:
   - Verify App ID is correct
   - Check if domain is whitelisted
   - Verify Web Push settings

## Contact OneSignal Support

If issue persists after all steps, contact OneSignal:
- Dashboard → Help → Contact Support
- Provide:
  - App ID: `f38c6f83-c20a-44c8-98a1-6a2571ad351f`
  - Domain: `app.hostelledger.aarx.online`
  - Error: Service worker origin mismatch
  - Files hosted: Yes, at /OneSignalSDK.sw.js and /OneSignalSDKWorker.js

---
**Date**: January 24, 2026
**Status**: Awaiting Deployment + Cache Clear
**Action Required**: Deploy, clear caches, test

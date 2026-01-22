# FORCE CACHE CLEAR - CreateGroupSheet Not Updating

## The Problem
Your browser is showing the OLD CreateGroupSheet (single page) instead of the NEW 3-step version, even though the code is correct.

## Solution: Complete Cache Clear

### Method 1: Restart Dev Server (RECOMMENDED)
1. **Close your browser completely**
2. **Run the restart script**:
   ```
   restart-dev-server.bat
   ```
3. **Wait 5 seconds** for server to start
4. **Open browser in Incognito/Private mode**: `Ctrl + Shift + N`
5. **Go to**: `http://localhost:8080`
6. **Test CreateGroupSheet** - should now show 3 steps

### Method 2: Manual Cache Clear
1. **Stop dev server**: Press `Ctrl + C` in the terminal running `npm run dev`
2. **Delete Vite cache**:
   ```
   rmdir /s /q node_modules\.vite
   rmdir /s /q .vite
   ```
3. **Clear browser cache**:
   - Open DevTools (`F12`)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
4. **Restart dev server**:
   ```
   npm run dev
   ```
5. **Open in Incognito mode** and test

### Method 3: Nuclear Option (If above don't work)
1. **Stop dev server**
2. **Delete all caches**:
   ```
   rmdir /s /q node_modules\.vite
   rmdir /s /q .vite
   rmdir /s /q dist
   ```
3. **Reinstall dependencies**:
   ```
   npm install
   ```
4. **Rebuild**:
   ```
   npm run build
   ```
5. **Start dev server**:
   ```
   npm run dev
   ```
6. **Open in Incognito mode**

### Method 4: Use Different Port
If cache is really stubborn, use a different port:
1. Stop dev server
2. Edit `vite.config.ts` and change port:
   ```typescript
   server: {
     port: 8081, // Changed from 8080
   }
   ```
3. Start dev server: `npm run dev`
4. Open: `http://localhost:8081`

## How to Verify It's Working

When you open CreateGroupSheet, you should see:

### ✅ NEW VERSION (3 Steps):
- **Step 1**: "Name & Icon" title at top
- Shows: Group name input + emoji picker ONLY
- Has "Continue" button at bottom
- NO "Add Members" section visible

### ❌ OLD VERSION (Single Page):
- Shows "Create New Group" title
- Shows ALL sections at once:
  - Group name
  - Emoji picker  
  - Add Members section
  - Members list
- Has "Create Group" button at bottom

## Why This Happens
- Vite dev server caches compiled JavaScript
- Browser caches the old JavaScript files
- Service Worker may cache old files
- Multiple layers of caching need to be cleared

## Quick Test
After clearing cache, open DevTools Console and type:
```javascript
// Should show the file with step-based rendering
fetch('/src/components/CreateGroupSheet.tsx').then(r => r.text()).then(console.log)
```

## Still Not Working?
If you still see the old version after trying all methods:

1. **Check if file was saved**:
   ```
   type src\components\CreateGroupSheet.tsx | findstr "step === 1"
   ```
   Should show: `{step === 1 && "Name & Icon"}`

2. **Check dev server output** - look for:
   ```
   [vite] page reload src/components/CreateGroupSheet.tsx
   ```

3. **Try a different browser** (Chrome, Firefox, Edge)

4. **Check if service worker is interfering**:
   - Open DevTools → Application → Service Workers
   - Click "Unregister" on any service workers
   - Hard refresh

## Production Deployment
For production, the old version will remain until you:
1. Build: `npm run build`
2. Deploy the `dist` folder to Vercel/hosting
3. Users clear their cache or wait for cache to expire

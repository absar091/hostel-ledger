# Quick Deployment Guide for Hostel Ledger Landing Page

## Current Setup
- App URL: `https://hostel-ledger.vercel.app`
- Landing page will be deployed separately

## Option 1: Deploy to Vercel (Separate Project) ⭐ RECOMMENDED

### Step 1: Create New Vercel Project
1. Go to https://vercel.com/new
2. Click "Add New" → "Project"
3. Import your GitHub repo (or upload folder)

### Step 2: Configure Project
```
Project Name: hostel-ledger-landing
Root Directory: landing-page
Framework Preset: Other
Build Command: (leave empty)
Output Directory: (leave empty)
```

### Step 3: Deploy
- Click "Deploy"
- Your landing page will be at: `hostel-ledger-landing.vercel.app`

### Step 4: Custom Domain (Optional)
- Add custom domain like `www.hostelledger.com`
- Keep app at `app.hostelledger.com` or current Vercel URL

## Option 2: Deploy to Same Vercel Project (Quick Test)

### Method A: Add to Public Folder
1. Copy `landing-page/index.html` to `public/landing.html`
2. Access at: `https://hostel-ledger.vercel.app/landing.html`

### Method B: Create Route
1. Create `src/pages/Landing.tsx` with the landing page
2. Add route in `App.tsx`
3. Access at: `https://hostel-ledger.vercel.app/landing`

## Option 3: GitHub Pages (Free)

1. Create new repo: `hostel-ledger-landing`
2. Upload `landing-page/index.html`
3. Enable GitHub Pages in Settings
4. Access at: `yourusername.github.io/hostel-ledger-landing`

## Testing the Landing Page Locally

```bash
# Navigate to landing-page folder
cd landing-page

# Start a simple HTTP server
# Python 3
python -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000

# Or Node.js (install http-server first)
npx http-server -p 8000

# Open browser
# http://localhost:8000
```

## What Happens When User Clicks "Download App"?

1. **If PWA is available**: Browser shows install prompt
2. **If PWA not available**: Redirects to `https://hostel-ledger.vercel.app/signup`

## Files Needed

Make sure these files are in the landing-page folder:
- ✅ `index.html` (already created)
- ✅ `only-logo.png` (copy from your public folder)
- ⚠️ `og-image.png` (optional - for social media previews)

## Quick Copy Logo Command

```bash
# From your project root
cp public/only-logo.png landing-page/
```

## Recommended Setup for Production

```
Landing Page:  www.hostelledger.com  (marketing)
App:          app.hostelledger.com  (your React app)
```

Benefits:
- SEO optimized landing page for Google
- Fast loading static page
- Separate marketing from app
- Professional appearance

## Need Help?

If you want me to:
1. Create a React version of the landing page
2. Add it as a route in your current app
3. Help with custom domain setup

Just let me know!

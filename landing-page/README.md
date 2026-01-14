# Hostel Ledger Landing Page

A beautiful, SEO-optimized landing page for Hostel Ledger expense tracking app.

## Current Setup

- **App URL**: `https://hostel-ledger.vercel.app`
- **Landing Page**: Will be deployed separately (see DEPLOY.md)

## Quick Start

1. **Copy your logo**:
   ```bash
   cp ../public/only-logo.png .
   ```

2. **Test locally**:
   - Windows: Double-click `test-locally.bat`
   - Mac/Linux: `python3 -m http.server 8000`
   - Open: `http://localhost:8000`

3. **Deploy**: See `DEPLOY.md` for deployment options

## Features

✅ **Fully SEO Optimized**
- Meta tags for search engines
- Open Graph tags for social media
- Structured data (Schema.org)
- Semantic HTML
- Fast loading

✅ **PWA Install Button**
- Triggers browser's native install prompt
- Falls back to app signup if PWA not available
- Works on all modern browsers

✅ **Responsive Design**
- Mobile-first approach
- Works on all screen sizes
- Touch-friendly interactions

✅ **Premium Design**
- Matches app's emerald/teal theme
- Smooth animations
- Professional layout

## Deployment Options

### Option 1: Vercel (Recommended)
1. Push this folder to GitHub
2. Connect to Vercel
3. Deploy with one click
4. Custom domain: `www.hostelledger.com`

### Option 2: Netlify
1. Drag and drop the `landing-page` folder
2. Or connect to GitHub
3. Auto-deploy on push

### Option 3: GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages in settings
3. Select branch and folder

### Option 4: Any Static Host
Upload the `index.html` file to any web hosting service.

## Configuration

### Update URLs
Replace these URLs in `index.html`:

```html
<!-- Line 15-16: Open Graph URLs -->
<meta property="og:url" content="https://hostelledger.com/">
<meta property="og:image" content="https://hostelledger.com/og-image.png">

<!-- Line 19-21: Twitter URLs -->
<meta property="twitter:url" content="https://hostelledger.com/">
<meta property="twitter:image" content="https://hostelledger.com/og-image.png">

<!-- Line 28: Canonical URL -->
<link rel="canonical" href="https://hostelledger.com/">

<!-- Line 340: App redirect URL -->
window.location.href = 'https://app.hostelledger.com/signup';
```

### Add Images
Place these files in the same folder:
- `only-logo.png` - Your app logo
- `og-image.png` - Social media preview image (1200x630px recommended)

## SEO Checklist

- [x] Title tag (50-60 characters)
- [x] Meta description (150-160 characters)
- [x] Keywords meta tag
- [x] Open Graph tags
- [x] Twitter Card tags
- [x] Structured data (Schema.org)
- [x] Semantic HTML (h1, h2, etc.)
- [x] Alt text for images
- [x] Mobile-friendly
- [x] Fast loading
- [x] HTTPS (when deployed)

## Testing

### Test PWA Install
1. Open in Chrome/Edge
2. Click any "Download App" button
3. Should show install prompt

### Test SEO
- Google Search Console
- Facebook Sharing Debugger
- Twitter Card Validator
- Google Rich Results Test

## Analytics (Optional)

Add Google Analytics by inserting before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Support

For questions or issues, contact: support@hostelledger.com

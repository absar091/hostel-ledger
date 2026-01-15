# Hosting Setup Guide

## Overview
This document explains where each folder should be deployed for your complete hosting setup.

---

## Hosting Structure

### 1. AARX Labs Main Website
**Domain**: `aarx.online`  
**Folder**: `aarx-website/`  
**Files to Deploy**:
- `index.html` (homepage)
- `about.html`
- `contact.html`
- `privacy.html`
- `terms.html`
- `robots.txt`
- `sitemap.xml`

**Purpose**: Main company website showcasing AARX Labs and all projects

---

### 2. Hostel Ledger Landing Page
**Domain**: `hostelledger.aarx.online`  
**Folder**: `landing-page/`  
**Files to Deploy**:
- `index.html` (landing page)
- `robots.txt`
- `sitemap.xml`

**Purpose**: Marketing landing page for Hostel Ledger app

---

### 3. Hostel Ledger Web Application
**Domain**: `app.hostelledger.aarx.online`  
**Folder**: `dist/` (after building the React app)  
**Build Command**: `npm run build`  
**Files to Deploy**: All files from `dist/` folder after build

**Purpose**: The actual Hostel Ledger web application

---

## Deployment Steps

### For AARX Labs Website (`aarx.online`)
1. Upload all files from `aarx-website/` folder to your hosting
2. Ensure `robots.txt` and `sitemap.xml` are in the root directory
3. Verify all pages are accessible:
   - https://aarx.online/
   - https://aarx.online/about.html
   - https://aarx.online/contact.html
   - https://aarx.online/privacy.html
   - https://aarx.online/terms.html

### For Hostel Ledger Landing Page (`hostelledger.aarx.online`)
1. Upload all files from `landing-page/` folder to your hosting
2. Ensure `robots.txt` and `sitemap.xml` are in the root directory
3. Verify the landing page is accessible:
   - https://hostelledger.aarx.online/

### For Hostel Ledger App (`app.hostelledger.aarx.online`)
1. Build the React application:
   ```bash
   npm run build
   ```
2. Upload all files from the `dist/` folder to your hosting
3. Configure your hosting for Single Page Application (SPA):
   - All routes should redirect to `index.html`
   - Enable client-side routing
4. Verify the app is accessible:
   - https://app.hostelledger.aarx.online/

---

## DNS Configuration

### Required DNS Records

#### For `aarx.online`
```
Type: A or CNAME
Host: @
Value: [Your hosting IP or domain]
```

#### For `hostelledger.aarx.online`
```
Type: CNAME or A
Host: hostelledger
Value: [Your hosting IP or domain]
```

#### For `app.hostelledger.aarx.online`
```
Type: CNAME or A
Host: app.hostelledger
Value: [Your hosting IP or domain]
```

---

## SEO Files Location

### AARX Labs (`aarx.online`)
- ✅ `robots.txt` → Root of `aarx-website/`
- ✅ `sitemap.xml` → Root of `aarx-website/`
- ✅ All pages have comprehensive SEO meta tags
- ✅ Schema.org structured data included

### Hostel Ledger Landing (`hostelledger.aarx.online`)
- ✅ `robots.txt` → Root of `landing-page/`
- ✅ `sitemap.xml` → Root of `landing-page/`
- ✅ Comprehensive SEO meta tags
- ✅ Schema.org structured data included
- ✅ Links to app at `app.hostelledger.aarx.online`

### Hostel Ledger App (`app.hostelledger.aarx.online`)
- The React app has its own SEO configuration
- Ensure proper meta tags in `index.html`
- Configure Open Graph tags for social sharing

---

## Verification Checklist

### After Deployment

#### AARX Labs Website
- [ ] Homepage loads: https://aarx.online/
- [ ] About page loads: https://aarx.online/about.html
- [ ] Contact redirects to email: https://aarx.online/contact.html
- [ ] Privacy policy loads: https://aarx.online/privacy.html
- [ ] Terms of service loads: https://aarx.online/terms.html
- [ ] Robots.txt accessible: https://aarx.online/robots.txt
- [ ] Sitemap accessible: https://aarx.online/sitemap.xml
- [ ] All project links work (Hostel Ledger, Quizzical Labz)

#### Hostel Ledger Landing Page
- [ ] Landing page loads: https://hostelledger.aarx.online/
- [ ] Robots.txt accessible: https://hostelledger.aarx.online/robots.txt
- [ ] Sitemap accessible: https://hostelledger.aarx.online/sitemap.xml
- [ ] "Launch App" button links to: https://app.hostelledger.aarx.online/
- [ ] Footer links to AARX Labs work
- [ ] All images load correctly

#### Hostel Ledger App
- [ ] App loads: https://app.hostelledger.aarx.online/
- [ ] Login/Signup works
- [ ] All routes work (Dashboard, Activity, Profile, etc.)
- [ ] Firebase authentication works
- [ ] Backend API connection works

---

## Submit to Search Engines

### After All Sites Are Live

#### Google Search Console
1. Add all three properties:
   - `aarx.online`
   - `hostelledger.aarx.online`
   - `app.hostelledger.aarx.online`
2. Submit sitemaps:
   - https://aarx.online/sitemap.xml
   - https://hostelledger.aarx.online/sitemap.xml
3. Request indexing for main pages

#### Bing Webmaster Tools
1. Add all three properties
2. Submit sitemaps
3. Request indexing

---

## Cross-Linking Structure

### AARX Labs → Projects
- Homepage has clickable project cards linking to:
  - Hostel Ledger: `https://hostelledger.aarx.online`
  - Quizzical Labz: `https://ai.quizzicallabz.aarx.online`
- Footer has project links

### Hostel Ledger Landing → App
- "Launch App" button → `https://app.hostelledger.aarx.online`
- "Get Started" button → `https://app.hostelledger.aarx.online`
- Footer AARX Labs logo → `https://aarx.online`

### Hostel Ledger App → Landing
- About page → Links to `https://hostelledger.aarx.online`
- Privacy Policy → App's own privacy page
- Terms of Service → App's own terms page

---

## Important Notes

### Static Sites (HTML)
- `aarx-website/` → Static HTML files
- `landing-page/` → Static HTML files
- Just upload files directly to hosting

### React App (SPA)
- Must build first: `npm run build`
- Deploy `dist/` folder contents
- Configure hosting for SPA routing
- All routes should serve `index.html`

### Environment Variables
- Ensure `.env` files are configured for production
- Update Firebase config if needed
- Update backend API URLs if needed

---

## Folder Summary

```
Project Root
│
├── aarx-website/          → Deploy to: aarx.online
│   ├── index.html
│   ├── about.html
│   ├── contact.html
│   ├── privacy.html
│   ├── terms.html
│   ├── robots.txt
│   └── sitemap.xml
│
├── landing-page/          → Deploy to: hostelledger.aarx.online
│   ├── index.html
│   ├── robots.txt
│   └── sitemap.xml
│
├── dist/                  → Deploy to: app.hostelledger.aarx.online
│   └── (Build output)     (After running: npm run build)
│
└── src/                   → Source code (don't deploy)
    └── (React app source)
```

---

## Contact
For deployment issues:
**Email**: support@aarx.online
**Company**: AARX Labs
**Slogan**: Innovate. Build. Launch.

---

*Last Updated: January 15, 2026*

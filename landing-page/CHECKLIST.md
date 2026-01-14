# Landing Page Launch Checklist

## Before Deployment

### Files
- [ ] Copy `only-logo.png` from `public/` folder
- [ ] (Optional) Create `og-image.png` for social media (1200x630px)

### Testing
- [ ] Test locally using `test-locally.bat` or Python server
- [ ] Check all "Download App" buttons work
- [ ] Test mobile menu on small screen
- [ ] Verify all links work
- [ ] Check responsive design on different screen sizes

### Content Review
- [ ] Review all text for typos
- [ ] Verify phone numbers/emails if added
- [ ] Check social media links in footer
- [ ] Confirm app URL is correct (`hostel-ledger.vercel.app`)

## Deployment

### Choose Deployment Method
- [ ] Option 1: New Vercel project (recommended)
- [ ] Option 2: Add to existing Vercel project
- [ ] Option 3: GitHub Pages
- [ ] Option 4: Other static host

### After Deployment
- [ ] Test PWA install button
- [ ] Verify all images load
- [ ] Check mobile responsiveness
- [ ] Test all navigation links
- [ ] Verify download buttons redirect correctly

## SEO & Marketing

### Search Engine Optimization
- [ ] Submit to Google Search Console
- [ ] Submit sitemap (if applicable)
- [ ] Test with Google Rich Results Test
- [ ] Verify meta tags with Facebook Sharing Debugger
- [ ] Test Twitter Card with Twitter Card Validator

### Analytics (Optional)
- [ ] Add Google Analytics
- [ ] Set up conversion tracking
- [ ] Monitor page performance

### Social Media
- [ ] Share on Facebook (test preview)
- [ ] Share on Twitter (test card)
- [ ] Share on LinkedIn
- [ ] Share on Instagram (link in bio)

## Custom Domain (Optional)

If you want a custom domain like `www.hostelledger.com`:

### Steps
1. [ ] Buy domain (Namecheap, GoDaddy, etc.)
2. [ ] Add domain to Vercel project
3. [ ] Update DNS records
4. [ ] Wait for SSL certificate (automatic)
5. [ ] Update URLs in `index.html`

### Recommended Setup
```
www.hostelledger.com  → Landing page
app.hostelledger.com  → Your React app
```

## Maintenance

### Regular Updates
- [ ] Update user count/ratings periodically
- [ ] Add new features to Features section
- [ ] Update screenshots if app UI changes
- [ ] Keep social media links active

### Monitoring
- [ ] Check Google Analytics weekly
- [ ] Monitor page load speed
- [ ] Check for broken links monthly
- [ ] Review and respond to user feedback

## Quick Commands

```bash
# Test locally
cd landing-page
python -m http.server 8000

# Copy logo
cp ../public/only-logo.png landing-page/

# Deploy to Vercel (from project root)
vercel --prod

# Check if PWA is working
# Open Chrome DevTools → Application → Manifest
```

## Need Help?

- Deployment issues? Check `DEPLOY.md`
- Technical questions? Check `README.md`
- Want to customize? Edit `index.html`

---

**Current Status**: ⏳ Ready to deploy
**Last Updated**: January 2026

# AARX Labs Subdomain Setup

This document explains how to set up subdomains for AARX Labs that redirect to various pages.

## Subdomain Structure

All subdomains follow the pattern: `[page].aarx.online`

### Created Redirect Pages

1. **about.aarx.online** → `https://hostel-ledger.vercel.app/about`
   - File: `about.html`
   - Shows information about AARX Labs

2. **terms.aarx.online** → `https://hostel-ledger.vercel.app/terms-of-service`
   - File: `terms.html`
   - Terms of Service page

3. **privacy.aarx.online** → `https://hostel-ledger.vercel.app/privacy-policy`
   - File: `privacy.html`
   - Privacy Policy page

4. **contact.aarx.online** → Contact information page
   - File: `contact.html`
   - Shows email and project links

### Existing Project Subdomains

- **hostelledger.aarx.online** → Hostel Ledger App
- **ai.quizzicallabz.aarx.online** → QuizzicalLabz AI Platform

## DNS Configuration

To set up these subdomains, add the following DNS records in your domain registrar:

### For Vercel-hosted pages (about, terms, privacy, contact):

```
Type: CNAME
Name: about
Value: cname.vercel-dns.com
TTL: Auto

Type: CNAME
Name: terms
Value: cname.vercel-dns.com
TTL: Auto

Type: CNAME
Name: privacy
Value: cname.vercel-dns.com
TTL: Auto

Type: CNAME
Name: contact
Value: cname.vercel-dns.com
TTL: Auto
```

### Vercel Project Configuration

In your Vercel project settings:

1. Go to **Settings** → **Domains**
2. Add each subdomain:
   - `about.aarx.online`
   - `terms.aarx.online`
   - `privacy.aarx.online`
   - `contact.aarx.online`

3. Configure redirects in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "https://hostel-ledger.vercel.app/about",
      "permanent": true
    }
  ]
}
```

## How Redirects Work

Each HTML file uses three methods to ensure reliable redirection:

1. **Meta Refresh Tag**: `<meta http-equiv="refresh" content="0; url=...">`
2. **Canonical Link**: `<link rel="canonical" href="...">`
3. **JavaScript Fallback**: `setTimeout(() => window.location.href = '...', 1000)`

This ensures users are redirected even if one method fails.

## Testing

After DNS propagation (can take up to 48 hours), test each subdomain:

- https://about.aarx.online
- https://terms.aarx.online
- https://privacy.aarx.online
- https://contact.aarx.online

## Maintenance

To update redirect destinations:

1. Edit the corresponding HTML file (e.g., `about.html`)
2. Update the URL in:
   - Meta refresh tag
   - Canonical link
   - JavaScript redirect
   - Manual link text

## Notes

- All redirect pages include a loading spinner and AARX Labs branding
- Users see a brief "Redirecting..." message before being sent to the destination
- If JavaScript is disabled, the meta refresh tag handles the redirect
- A manual link is provided as a final fallback

# Backend Deployment Instructions

## Current Issue
The backend API is returning HTML instead of JSON, which suggests the deployment needs to be updated with the latest rate limiting fixes.

## Steps to Redeploy Backend

1. **Navigate to the backend directory:**
   ```bash
   cd backend-server
   ```

2. **Verify the environment variables are set:**
   Check that `.env` file exists with proper SMTP configuration:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=ahmadraoabsar@gmail.com
   SMTP_PASS=uzpk gcix ebfh sfrg
   EMAIL_FROM=Hostel Ledger<noreply@quizzicallabz.qzz.io>
   FRONTEND_URL=https://hostel-ledger.vercel.app
   ```

3. **Deploy to Vercel:**
   ```bash
   # If you have Vercel CLI installed
   vercel --prod
   
   # Or push to GitHub and let Vercel auto-deploy
   git add .
   git commit -m "Fix rate limiting and CORS issues"
   git push origin main
   ```

## Changes Made to Fix Issues

1. **Removed rate limiting from health endpoint** - Health checks should not be rate limited
2. **Applied general rate limiting only to /api routes** - Root and health endpoints are now exempt
3. **Increased rate limits significantly:**
   - Email endpoints: 100 requests per 15 minutes (was 50)
   - General API endpoints: 200 requests per 15 minutes (was 100)
4. **Improved CORS configuration** - Includes both localhost and production URLs

## Testing After Deployment

Run the test script to verify the backend is working:
```bash
node test-backend-connection.js
```

Expected output should show:
- ✅ Health check passed
- ✅ Root endpoint working  
- ✅ Verification email endpoint working (or rate limited, which is expected)

## Troubleshooting

If the backend still returns HTML:
1. Check Vercel deployment logs
2. Verify the `server.js` file is being used as the entry point
3. Ensure all dependencies are properly installed
4. Check that environment variables are set in Vercel dashboard
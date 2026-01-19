# Backend Email API Setup Guide

Your own backend email system is now ready! Here's how to set it up and use it.

## 🚀 Quick Start

### Step 1: Start the Backend Server

**Windows:**
```bash
# Double-click the file or run in terminal:
start-backend.bat
```

**Mac/Linux:**
```bash
chmod +x start-backend.sh
./start-backend.sh
```

**Manual Setup:**
```bash
cd backend-server
npm install
npm start
```

### Step 2: Test the System

1. **Check Backend Health**: Visit http://localhost:3001/health
2. **Try Signup**: Go to your app and sign up with your email
3. **Check Email**: You should receive a real email with verification code!

## 📧 How It Works

### Email Flow Priority:
1. **Backend API** (Primary) - Sends real emails via Gmail SMTP
2. **Fallback Mode** - Shows alerts if backend is unavailable

### Backend Features:
- ✅ **Real Gmail SMTP**: Uses your credentials (ahmadraoabsar@gmail.com)
- ✅ **Rate Limiting**: Prevents spam (10 emails per 15 minutes per IP)
- ✅ **Beautiful Templates**: Professional HTML email designs
- ✅ **Error Handling**: Graceful fallbacks and detailed logging
- ✅ **CORS Enabled**: Works with your frontend
- ✅ **Security**: Input validation and sanitization

## 🔧 Backend API Endpoints

### Health Check
```
GET http://localhost:3001/health
```

### Send Verification Email
```
POST http://localhost:3001/api/send-verification
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "name": "John Doe"
}
```

### Send Password Reset Email
```
POST http://localhost:3001/api/send-password-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "resetLink": "http://localhost:5173/reset-password?token=abc123",
  "name": "John Doe"
}
```

### Send Generic Email
```
POST http://localhost:3001/api/send-email
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello World!</h1>",
  "text": "Hello World!"
}
```

## 📱 Frontend Integration

The frontend automatically detects and uses your backend API:

```javascript
// Automatically tries backend API first
const result = await sendVerificationEmail(email, code, name);

// Falls back to development mode if backend unavailable
if (!result.success) {
  console.log("Fallback mode activated");
}
```

## 🔒 SMTP Configuration

Your Gmail SMTP is already configured:
- **Host**: smtp.gmail.com
- **Port**: 587
- **User**: ahmadraoabsar@gmail.com
- **App Password**: uzpk gcix ebfh sfrg

## 🚀 Production Deployment

### Deploy to Heroku:
```bash
cd backend-server
git init
git add .
git commit -m "Initial commit"
heroku create your-app-name
git push heroku main
```

### Deploy to Vercel:
```bash
cd backend-server
vercel --prod
```

### Deploy to Railway:
```bash
cd backend-server
railway login
railway init
railway up
```

### Update Frontend for Production:
```env
# In your .env file
VITE_API_URL=https://your-backend-url.herokuapp.com
```

## 🧪 Testing

### Test Verification Email:
```bash
curl -X POST http://localhost:3001/api/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","code":"123456","name":"Test User"}'
```

### Test Password Reset:
```bash
curl -X POST http://localhost:3001/api/send-password-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","resetLink":"http://localhost:5173/reset","name":"Test User"}'
```

## 📊 Monitoring

### Backend Logs:
- ✅ Email sent successfully
- ❌ Email sending errors
- 📧 SMTP configuration status
- 🔒 Rate limiting alerts

### Frontend Logs:
- 📧 Email sending attempts
- ✅ Backend API success
- ⚠️ Fallback mode activation
- ❌ Error details

## 🛠 Troubleshooting

### Backend Not Starting:
1. Check if port 3001 is available
2. Verify Node.js is installed
3. Run `npm install` in backend-server folder

### Emails Not Sending:
1. Check Gmail SMTP credentials
2. Verify app password is correct
3. Check backend logs for errors
4. Test with curl commands

### CORS Issues:
1. Verify FRONTEND_URL in backend .env
2. Check browser console for CORS errors
3. Ensure backend is running on port 3001

## 📈 Next Steps

1. **Start Backend**: Run the startup script
2. **Test Emails**: Try signup/password reset
3. **Deploy**: Choose a hosting platform
4. **Monitor**: Check logs and email delivery
5. **Scale**: Add more email templates as needed

## 🎯 Current Status

- ✅ **Backend Server**: Ready to run
- ✅ **SMTP Config**: Gmail credentials set
- ✅ **Frontend**: API integration complete
- ✅ **Templates**: Professional email designs
- ✅ **Fallbacks**: Graceful error handling

Your email system is production-ready! Just start the backend server and you'll have real email sending capability.
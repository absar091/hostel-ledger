# Firebase Setup Instructions

## 🔥 Setting up Firebase for Hostel Wallet

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `hostel-wallet` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

### 3. Setup Realtime Database

1. Go to **Realtime Database** in Firebase Console
2. Click "Create Database"
3. Choose **Start in test mode** (for development)
4. Select your preferred location
5. Click "Done"

### 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app icon (`</>`)
4. Enter app nickname: `hostel-wallet-web`
5. Click "Register app"
6. Copy the Firebase configuration object

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Replace the placeholder values in `.env` with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your-actual-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### 6. Database Security Rules (Production)

For production, update your Realtime Database rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "groups": {
      "$groupId": {
        ".read": "auth != null && (root.child('userGroups').child(auth.uid).child($groupId).exists() || data.child('createdBy').val() === auth.uid)",
        ".write": "auth != null && (root.child('userGroups').child(auth.uid).child($groupId).exists() || data.child('createdBy').val() === auth.uid)"
      }
    },
    "userGroups": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "transactions": {
      "$transactionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userTransactions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### 7. Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. Try creating an account
4. Check Firebase Console to see if:
   - User appears in Authentication
   - User data appears in Realtime Database

### 8. Features Enabled

✅ **Real-time Authentication**
- Email/password signup and login
- Secure user sessions
- Automatic logout on token expiry

✅ **Real-time Database Sync**
- Groups sync across devices
- Transactions update in real-time
- Wallet balances sync instantly

✅ **Multi-device Support**
- Login from any device
- Data syncs automatically
- Consistent experience everywhere

✅ **Offline Support**
- Firebase handles offline caching
- Changes sync when back online
- Reliable data persistence

### 9. Deployment

For production deployment:

1. Update Firebase security rules (see step 6)
2. Set environment variables in your hosting platform
3. Build the app: `npm run build`
4. Deploy to your preferred platform (Vercel, Netlify, etc.)

### 10. Monitoring

Monitor your app in Firebase Console:
- **Authentication**: User signups and logins
- **Database**: Data usage and performance
- **Analytics**: User engagement (if enabled)

## 🚀 You're Ready!

Your Hostel Wallet app now has:
- Real-time multi-user support
- Secure authentication
- Cloud data synchronization
- Production-ready architecture

Happy expense tracking! 💰
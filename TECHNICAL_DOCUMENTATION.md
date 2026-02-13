
# 📖 Hostel Ledger - Technical Documentation

This document provides in-depth technical explanation of how Hostel Ledger works, covering architecture decisions, data flow, and implementation details.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication Flow](#authentication-flow)
3. [Data Synchronization](#data-synchronization)
4. [Financial Logic](#financial-logic)
5. [Offline Support](#offline-support)
6. [Push Notifications](#push-notifications)
7. [Security Implementation](#security-implementation)
8. [Database Design](#database-design)
9. [API Reference](#api-reference)

---

## System Overview

Hostel Ledger is a **real-time expense splitting application** that enables hostelmates and friends to track shared expenses and settle debts. The system follows a **client-server** architecture with **Firebase Realtime Database** as the primary data store.

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOSTEL LEDGER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   Frontend      │    │   Backend        │                  │
│  │   (React/Vite)  │◄──►│   (Express.js)   │                  │
│  └────────┬─────────┘    └────────┬─────────┘                  │
│           │                        │                             │
│           │  ┌────────────────────┘                             │
│           │  │                                                  │
│           ▼  ▼                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │      Firebase Realtime Database     │                        │
│  │  • Users, Groups, Transactions      │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  ┌─────────────────────────────────────┐                        │
│  │      IndexedDB (Offline Storage)     │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │  Zoho    │  │ OneSignal│  │ Cloudinary│                   │
│  │  Mail    │  │  Push    │  │   Images │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Overview

The application uses **Firebase Authentication** for user management. The authentication state is managed through React Context and synchronized with the Realtime Database for profile data.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. User opens app
       │
       ▼
2. App checks localStorage for cached user
       │
       ├─► Found → Load cached profile → Show app
       │
       ▼ (No cache)
3. Firebase onAuthStateChanged fires
       │
       ├─► User logged in → Subscribe to profile → Show app
       │
       ├─► No user → Redirect to login
       │
       ▼ (Error/Timeout)
4. Fallback to cached user if available
```

### Implementation Details

#### Frontend (FirebaseAuthContext.tsx)

```typescript
// Auth state listener setup
useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    setFirebaseUser(user);
    if (user) {
      // Subscribe to real-time profile updates
      setupProfileSubscription(user.uid);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  });
  
  return () => unsubscribeAuth();
}, []);

// Profile subscription with real-time updates
const setupProfileSubscription = (uid: string) => {
  const userRef = ref(database, `users/${uid}`);
  onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      setUser({ uid, ...userData });
      // Cache to localStorage for offline
      localStorage.setItem('cachedUser', JSON.stringify(userData));
    }
  });
};
```

### Key Features

1. **Real-time Profile Sync**: Profile changes reflect immediately across devices
2. **Offline Caching**: User data cached in localStorage for offline access
3. **Session Persistence**: Firebase handles session automatically
4. **Timeout Handling**: 5-second timeout prevents infinite loading states

---

## Data Synchronization

### Overview

Data synchronization happens through **Firebase Realtime Database listeners**. The system uses a **pull-based** model where the frontend subscribes to specific data paths.

### Synchronization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                 DATA SYNCHRONIZATION LAYERS                      │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Authentication State
├── Firebase Auth State
└── User Profile (users/{uid})

Layer 2: Group Data
├── userGroups/{uid} - User's group list (metadata)
└── groups/{groupId} - Full group data with members

Layer 3: Transaction Data
├── userTransactions/{uid} - User's transaction list (summary)
└── transactions/{transactionId} - Full transaction details

Layer 4: Invitations
├── userInvitations/{uid} - User's pending invitations
└── invitations/{invitationId} - Full invitation data
```

### Real-time Listeners

#### Groups Listener

```typescript
// In FirebaseDataContext.tsx
const groupsRef = ref(database, `userGroups/${user.uid}`);

onValue(groupsRef, (snapshot) => {
  const userGroups = snapshot.val() || {};
  const groupIds = Object.keys(userGroups);
  
  // Set up individual group listeners
  groupIds.forEach(groupId => {
    const groupRef = ref(database, `groups/${groupId}`);
    onValue(groupRef, (groupSnap) => {
      if (groupSnap.exists()) {
        updateGroupsState(groupId, groupSnap.val());
      }
    });
  });
});
```

### Denormalization Strategy

The database uses **denormalization** for efficient querying:

1. **userGroups**: Contains only metadata (name, emoji, memberCount)
2. **groups**: Contains full data (members, details)
3. **userTransactions**: Summary data for quick list rendering
4. **transactions**: Full transaction data for detail views

This prevents N+1 query problems and enables fast UI rendering.

---

## Financial Logic

### Expense Splitting Algorithm

The system uses a **penny-perfect rounding algorithm** to ensure no money is lost during splits.

```typescript
// In backend-server/server.js
const calculateExpenseSplit = (totalAmount, participants, payerId) => {
  // Convert to cents for precision
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / participants.length);
  const remainderCents = totalCents % participants.length;

  // Distribute remainder pennies fairly
  return participants.map((participant, index) => {
    const getsRemainder = index < remainderCents;
    return {
      participantId: participant.id,
      amount: (baseCents + (getsRemainder ? 1 : 0)) / 100,
      isRemainder: getsRemainder
    };
  });
};
```

#### Example

```
Total: Rs 1000, 3 participants

Base: 1000 / 3 = 333.33...
In cents: 100000 / 3 = 33333.33...
Base cents: 33333
Remainder: 1 penny

Distribution:
- Person 1: Rs 333.34 (gets remainder)
- Person 2: Rs 333.33
- Person 3: Rs 333.33

Total: 333.34 + 333.33 + 333.33 = Rs 1000 ✓
```

### Settlement Tracking

The system maintains **bidirectional settlement records**:

```typescript
// Settlement structure per group
{
  settlements: {
    "$groupId": {
      "$memberId": {
        toReceive: number,  // They owe you
        toPay: number      // You owe them
      }
    }
  }
}
```

#### Settlement Update Flow

```
User A pays Rs 900 for 3 people (A, B, C)
  │
  ├─► A's share: Rs 300
  ├─► B owes A: Rs 300
  └─► C owes A: Rs 300
 │
 ▼
Database updates (atomic transaction):
  │
  ├─► User B's settlements:
  │     settlements/group1/A = { toReceive: 0, toPay: 300 }
  │
  └─► User A's settlements:
        settlements/group1/B = { toReceive: 300, toPay: 0 }
```

### Wallet Deductions

When a user pays an expense:

1. **Check balance**: Verify user has sufficient wallet balance
2. **Deduct share**: Subtract user's share from wallet
3. **Record transaction**: Create transaction with wallet balance snapshot

```typescript
// In backend-server/server.js - add-expense endpoint
if (isCurrentUserPayer) {
  if ((user.walletBalance || 0) < amount) {
    return res.status(400).json({ 
      error: 'Insufficient wallet balance' 
    });
  }
  walletBalanceAfter -= userShare;
  updates[`users/${currentUserId}/walletBalance`] = walletBalanceAfter;
}
```

---

## Offline Support

### Overview

The application uses a **hybrid offline strategy**:

- **Read**: Served from IndexedDB cache
- **Write**: Queued for sync when online

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Service Worker    │
                    │  (PWA Cache Layer) │
                    └─────────┬───────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  IndexedDB      │  │  localStorage   │  │  Firebase      │
│  (Groups/Txns) │  │  (User Profile) │  │  (Online Only) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Offline Queue     │
                    │  (Pending Actions) │
                    └─────────────────────┘
```

### IndexedDB Schema

```typescript
// In src/lib/offlineDB.ts
interface HostelLedgerDB {
  "offline-expenses": {
    key: string;
    value: {
      id: string;
      groupId: string;
      amount: number;
      paidBy: string;
      participants: string[];
      timestamp: number;
      syncAttempts: number;
    };
  };
  "cached-groups": { key: string; value: any; };
  "cached-transactions": { key: string; value: any; };
  "offline-payments": { key: string; value: any; };
}
```

### Offline Detection & Sync

```typescript
// In FirebaseDataContext.tsx
useEffect(() => {
  const handleOnline = () => syncPendingData();
  const handleOffline = () => loadCachedData();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial load based on connection state
  if (!navigator.onLine) {
    loadCachedData();
  }
}, []);

// Sync pending offline actions
const syncPendingData = async () => {
  const offlineExpenses = await getOfflineExpenses();
  
  for (const expense of offlineExpenses) {
    try {
      await callSecureApi('/api/add-expense', expense);
      await deleteOfflineExpense(expense.id);
    } catch (error) {
      await updateSyncAttempt(expense.id);
    }
  }
};
```

### Offline Features Matrix

| Feature | Online | Offline |
|---------|--------|---------|
| View Groups | ✅ | ✅ (cached) |
| View Transactions | ✅ | ✅ (cached) |
| Add Expense | ✅ | ✅ (queued) |
| Record Payment | ✅ | ✅ (queued) |
| View Wallet Balance | ✅ | ✅ (cached) |
| Add Money to Wallet | ✅ | ❌ |
| Create Group | ✅ | ❌ |
| Login/Logout | ✅ | ✅ (cached session) |

---

## Push Notifications

### Overview

Push notifications are delivered via **OneSignal** with Firebase as the identity provider.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                PUSH NOTIFICATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. User subscribes on app load
       │
       ▼
2. OneSignal SDK registers device
       │
       ▼
3. Player ID stored in Firebase
       │  oneSignalPlayers/{uid} = { playerId: "..." }
       │
       ▼
4. Server triggers notification
       │  POST /api/push-notify
       │  OneSignal REST API
       │
       ▼
5. OneSignal delivers to device
```

### Subscription

```typescript
// In src/hooks/useOneSignalPush.ts
useEffect(() => {
  if (user?.uid) {
    // Initialize OneSignal
    OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    
    // Register with Firebase UID as external ID
    OneSignal.setExternalUserId(user.uid);
    
    // Store player ID in Firebase
    OneSignal.getUserId().then(playerId => {
      set(ref(database, `oneSignalPlayers/${user.uid}`), {
        playerId,
        updatedAt: new Date().toISOString()
      });
    });
  }
}, [user?.uid]);
```

### Sending Notifications

```typescript
// In backend-server/server.js
const sendOneSignalNotificationInternal = async ({ 
  userIds, 
  title, 
  body 
}) => {
  const response = await fetch(
    'https://onesignal.com/api/v1/notifications',
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        headings: { en: title },
        contents: { en: body }
      })
    }
  );
  
  return response.json();
};
```

---

## Security Implementation

### Authentication Security

1. **Firebase ID Tokens**: All API requests include Firebase JWT
2. **Token Verification**: Server validates tokens using Firebase Admin SDK
3. **Session Management**: Automatic session handling by Firebase

```typescript
// In backend-server/server.js
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Input Validation

All user inputs are validated and sanitized:

```typescript
// In src/lib/security.ts
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '')  // Remove HTML characters
    .substring(0, 200);       // Limit length
};

export const validateAmount = (amount: number) => {
  if (isNaN(amount) || amount <= 0) {
    return { isValid: false, error: 'Amount must be positive' };
  }
  if (amount > 1000000) {
    return { isValid: false, error: 'Amount exceeds limit' };
  }
  return { isValid: true };
};
```

### Rate Limiting

The backend implements rate limiting to prevent abuse:

```javascript
// In backend-server/server.js
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,                   // 200 requests per window
  message: { error: 'Too many requests' }
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many email requests' }
});

app.use('/api', generalLimiter);
```

### Firebase Security Rules

```javascript
// In database.rules.json
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
        ".read": "data.child('members').hasChild(auth.uid)",
        ".write": "data.child('createdBy').val() === auth.uid"
      }
    },
    "userGroups": {
      "$uid": {
        ".read": "$uid === auth.uid",
        "$groupId": {
          ".write": "auth !== null"
        }
      }
    },
    "transactions": {
      ".read": "auth !== null",
      ".write": "auth !== null"
    }
  }
}
```

---

## Database Design

### Data Models

#### User

```typescript
interface User {
  uid: string;
  email: string;
  username: string;        // Unique @username
  name: string;
  phone?: string;
  photoURL?: string;
  paymentDetails: {
    jazzCash?: string;
    easypaisa?: string;
    bankName?: string;
    accountNumber?: string;
    raastId?: string;
  };
  walletBalance: number;
  settlements: {
    [groupId: string]: {
      [memberId: string]: {
        toReceive: number;
        toPay: number;
      };
    };
  };
  favoriteGroups: string[];
  createdAt: string;
}
```

#### Group

```typescript
interface Group {
  id: string;
  name: string;
  emoji: string;
  coverPhoto?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
}

interface GroupMember {
  id: string;
  name: string;
  userId?: string;        // Firebase UID if registered
  username?: string;
  isTemporary: boolean;
  paymentDetails: PaymentDetails;
  phone?: string;
  isAdmin?: boolean;
}
```

#### Transaction

```typescript
interface Transaction {
  id: string;
  groupId: string;
  type: 'expense' | 'payment' | 'wallet_add' | 'wallet_deduct';
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  paidByName: string;
  participants?: {
    id: string;
    name: string;
    amount: number;
  }[];
  from?: string;
  fromName?: string;
  to?: string;
  toName?: string;
  method?: 'cash' | 'online';
  note?: string;
  place?: string;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
  createdAt: string;
}
```

### Indexing Strategy

The database uses **secondary indexes** for common queries:

```
usernames/{username} → { uid }
userGroups/{uid} → { groupId: { metadata } }
userTransactions/{uid} → { transactionId: { summary } }
```

---

## API Reference

### Authentication Endpoints

#### POST /api/create-group

Create a new expense group.

**Request:**

```json
{
  "name": "Hostel Expenses",
  "emoji": "🏠",
  "members": [
    { "name": "John", "phone": "+1234567890" }
  ],
  "invitedUsernames": ["john_doe"],
  "coverPhoto": "https://..."
}
```

**Response:**

```json
{
  "success": true,
  "groupId": "group_abc123",
  "message": "Group created successfully"
}
```

#### POST /api/add-expense

Add an expense to a group.

**Request:**

```json
{
  "groupId": "group_abc123",
  "amount": 1000,
  "paidBy": "user_123",
  "participants": ["user_123", "user_456"],
  "note": "Dinner",
  "place": "Restaurant",
  "clientTxnId": "uuid-v4"
}
```

**Response:**

```json
{
  "success": true,
  "transactionId": "txn_xyz789",
  "transaction": {
    "id": "txn_xyz789",
    "groupId": "group_abc123",
    "type": "expense",
    "amount": 1000,
    ...
  }
}
```

#### POST /api/record-payment

Record a payment between members.

**Request:**

```json
{
  "groupId": "group_abc123",
  "fromMember": "user_123",
  "toMember": "user_456",
  "amount": 500,
  "method": "cash",
  "note": "Dinner reimbursement"
}
```

#### POST /api/update-wallet

Add or deduct from wallet balance.

**Request:**

```json
{
  "amount": 1000,
  "type": "add",
  "note": "Added money from bank"
}
```

### Invitation Endpoints

#### POST /api/send-invitation

Send invitation to existing user by username.

```json
{
  "groupId": "group_abc123",
  "inviteeUsername": "john_doe"
}
```

#### POST /api/respond-invitation

Accept or decline an invitation.

```json
{
  "invitationId": "inv_123",
  "accept": true
}
```

#### POST /api/send-external-invitation

Send invitation via email to non-user.

```json
{
  "groupId": "group_abc123",
  "email": "friend@example.com"
}
```

### Push Notification Endpoints

#### POST /api/push-notify

Send notification to a single user.

```json
{
  "userId": "firebase_uid",
  "title": "New Expense",
  "body": "John added Rs 500 for dinner",
  "data": {
    "type": "expense",
    "groupId": "group_abc123"
  }
}
```

#### POST /api/push-notify-multiple

Send notification to multiple users.

```json
{
  "userIds": ["uid1", "uid2", "uid3"],
  "title": "Group Update",
  "body": "New member joined your group"
}
```

---

## Error Handling

### Error Types

```typescript
enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  NETWORK_ERROR = 'NETWORK_ERROR'
}
```

### Client Error Handling

```typescript
// In contexts and hooks
const handleApiError = (error: any) => {
  if (error.code === 'auth/invalid-credential') {
    return 'Invalid email or password';
  }
  if (error.code === 'auth/user-not-found') {
    return 'No account found with this email';
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'An unexpected error occurred';
};
```

---

## Performance Optimization

### Strategies Used

1. **Denormalization**: Store summary data for quick list rendering
2. **Lazy Loading**: Only fetch detail data when needed
3. **Caching**: IndexedDB for offline, localStorage for auth state
4. **Debouncing**: Debounce search and filter inputs
5. **Virtualization**: Use react-window for long lists
6. **Image Optimization**: Cloudinary for profile pictures

### Bundle Size

- Core dependencies: ~200KB gzipped
- Total bundle: ~350KB gzipped
- Lazy-loaded routes: ~100KB each

---

## Testing

### Unit Tests

Tests cover core financial logic:

```typescript
// Test expense splitting
test('splits Rs 1000 among 3 people correctly', () => {
  const splits = calculateExpenseSplit(1000, [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
    { id: '3', name: 'C' }
  ], '1');
  
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  expect(total).toBe(1000);
});
```

### Integration Tests

Test API endpoints with Firebase Admin SDK:

```javascript
// Test add-expense endpoint
test('creates transaction and updates settlements', async () => {
  const response = await request(app)
    .post('/api/add-expense')
    .set('Authorization', `Bearer ${validToken}`)
    .send({
      groupId: 'test_group',
      amount: 900,
      paidBy: 'user_a',
      participants: ['user_a', 'user_b', 'user_c'],
      note: 'Test expense'
    });
  
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
});
```

---

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Backend (Render/Railway)

1. Create Node.js service
2. Configure environment variables
3. Deploy from GitHub

### Environment Variables

**Frontend:**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=
VITE_ONESIGNAL_APP_ID=
```

**Backend:**

```
PORT=3000
NODE_ENV=production
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
FRONTEND_URL=
```

---

## Troubleshooting

### Common Issues

#### Infinite Loading Screen

**Cause**: Firebase auth timeout or network issues

**Solution**:

1. Check Firebase configuration
2. Verify network connectivity
3. Clear localStorage and retry

#### Offline Data Not Syncing

**Cause**: Network not restored or sync failed

**Solution**:

1. Ensure stable internet connection
2. Check browser console for errors
3. Try manually triggering sync

#### Push Notifications Not Working

**Cause**: OneSignal not configured or subscription failed

**Solution**:

1. Verify OneSignal App ID
2. Check browser notification permissions
3. Verify player ID stored in Firebase

#### Wallet Balance Incorrect

**Cause**: Race condition or failed transaction

**Solution**:

1. Refresh the page
2. Check Firebase console for transactions
3. Verify settlement calculations

---

## Appendix

### Glossary

- **Settlement**: Record of who owes whom in a group
- **Wallet**: User's personal money balance
- **Expense**: Shared cost split among members
- **Payment**: Money transfer between members
- **Idempotency**: Preventing duplicate transactions

### Dependencies

**Frontend:**

- react: ^18.2.0
- react-router-dom: ^6.x
- firebase: ^10.x
- @tanstack/react-query: ^5.x
- tailwindcss: ^3.x
- shadcn-ui: latest
- idb: ^7.x
- onesignal-web-shim: ^3.x

**Backend:**

- express: ^4.x
- firebase-admin: ^12.x
- nodemailer: ^6.x
- cors: ^2.x
- express-rate-limit: ^7.x
- dotenv: ^16.x

### Version History

- v1.0.0 - Initial release
- v2.0.0 - Added wallet system
- v3.0.0 - Offline support
- v4.0.0 - Push notifications (OneSignal)
- v5.0.0 - PWA improvements

---

*Last Updated: February 2026*

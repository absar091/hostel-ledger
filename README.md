# 🏠 Hostel Ledger - Complete Expense Tracking & Wallet Management

<p align="center">
  <img src="/only-logo.png" alt="Hostel Ledger Logo" width="120" />
</p>

<p align="center">
  <strong>A modern, real-time expense splitting and wallet management app</strong><br>
  Built with React, TypeScript, Firebase, and Tailwind CSS
</p>

---

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [💡 How It Works](#-how-it-works)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [💾 Database Structure](#-database-structure)
- [🔌 API Endpoints](#-api-endpoints)
- [📱 Offline Support](#-offline-support)
- [🔐 Security](#-security)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

---

## 🌟 Features

### 💰 **Complete Wallet System**

- **Real Wallet Balance**: Add money to your digital wallet
- **Automatic Deductions**: Your share is automatically deducted when you pay expenses
- **Smart Balance Tracking**: See your actual money vs. what others owe you
- **One-Click Payments**: Pay debts directly from your wallet with balance validation

### 👥 **Group Expense Management**

- **Create Groups**: Organize expenses by hostel, friends, or any group
- **Smart Splitting**: Automatic expense splitting with proper rounding (no money loss)
- **Real-time Sync**: All changes sync instantly across devices
- **Member Management**: Add/remove members with payment details

### 📊 **Advanced Tracking**

- **Dual Balance System**:
  - Wallet Balance (your actual money)
  - Group Balances (who owes whom)
- **Transaction History**: Complete timeline of all activities
- **Payment Methods**: Support for JazzCash, Easypaisa, bank transfers
- **Quick Pay**: One-click debt settlement with insufficient balance warnings

### 🔄 **Real-time Collaboration**

- **Multi-device Support**: Access from any device with real-time sync
- **Firebase Integration**: Secure cloud storage and authentication
- **Offline Support**: Works offline, syncs when back online
- **Live Updates**: See changes from other group members instantly

### 📱 **Mobile-First PWA**

- **Installable App**: Add to home screen on iOS and Android
- **Push Notifications**: Real-time alerts via OneSignal
- **Offline Mode**: Full functionality without internet connection
- **Native Experience**: iPhone-style splash screen and UI

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase account (free tier works)
- Backend server (Node.js/Express)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/absar091/hostel-ledger.git
   cd hostel-ledger
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup Firebase** (Required for real-time features)
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Authentication** (Email/Password provider)
   - Enable **Realtime Database** (not Firestore)
   - Copy `.env.example` to `.env` and add your Firebase config:

     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

4. **Setup Backend Server**

   ```bash
   cd backend-server
   npm install
   cp .env.example .env
   # Configure your SMTP and Firebase Admin credentials
   npm start
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**

   ```
   http://localhost:8080
   ```

---

## 💡 How It Works

### Example Scenario

1. **Add Money**: You add Rs 10,000 to your wallet
2. **Pay Expense**: You pay Rs 1,000 bill for 3 people
   - Your wallet: Rs 10,000 - Rs 333 = Rs 9,667 (your share deducted)
   - You'll receive: Rs 667 (others owe you)
3. **Someone Else Pays**: Friend pays Rs 600 for same 3 people
   - Your wallet: Rs 9,667 (no deduction, you didn't pay)
   - You owe: Rs 200 (your share)
4. **Quick Pay**: Click "Pay Now" to settle Rs 200 debt from wallet
   - Your wallet: Rs 9,667 - Rs 200 = Rs 9,467
   - Debt cleared automatically

### Smart Features

- **Automatic Rounding**: Every rupee is accounted for in splits
- **Idempotency**: Duplicate transaction prevention
- **Real-time Sync**: See updates instantly across all devices
- **Offline-First**: Works without internet, syncs when reconnected

---

## 🛠 Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Navigation
- **React Query** - Data fetching
- **Lucide React** - Icons

### Backend

- **Node.js** - Runtime
- **Express** - Web framework
- **Firebase Admin SDK** - Server-side Firebase
- **Nodemailer** - Email sending
- **OneSignal** - Push notifications
- **Rate Limiting** - API protection

### Database

- **Firebase Realtime Database** - Real-time sync
- **IndexedDB** - Offline storage (via idb)

### DevOps

- **Vercel** - Frontend hosting
- **Render/Railway** - Backend hosting

---

## 🏗 Architecture

### Frontend Architecture

```
src/
├── components/           # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── AddExpenseSheet.tsx
│   ├── AddMoneySheet.tsx
│   ├── GroupPendingInvitations.tsx
│   ├── InvitationsList.tsx
│   ├── RecordPaymentSheet.tsx
│   ├── TimelineItem.tsx
│   ├── TransactionDetailModal.tsx
│   └── ...
├── contexts/            # React contexts (State management)
│   ├── FirebaseAuthContext.tsx   # Authentication state
│   ├── FirebaseDataContext.tsx   # Groups & transactions
│   └── SidebarContext.tsx        # UI state
├── pages/              # Route components
│   ├── Index.tsx (Dashboard)
│   ├── Groups.tsx
│   ├── GroupDetail.tsx
│   ├── CreateGroup.tsx
│   ├── Profile.tsx
│   ├── Budget.tsx
│   ├── Activity.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── ...
├── hooks/              # Custom hooks
│   ├── usePendingGroupJoin.ts
│   ├── useOneSignalPush.ts
│   └── useSync.ts
├── lib/                # Utilities
│   ├── firebase.ts     # Firebase config
│   ├── api.ts         # API client
│   ├── offlineDB.ts   # IndexedDB wrapper
│   ├── expenseLogic.ts # Calculation logic
│   ├── transaction.ts # Transaction handling
│   └── security.ts    # Input validation
└── App.tsx            # Root component
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Login                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              FirebaseAuthContext (Auth State)               │
│  • onAuthStateChanged listener                             │
│  • Real-time profile subscription                          │
│  • LocalStorage caching for offline                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            FirebaseDataContext (Data Sync)                  │
│  • onValue listeners for groups & transactions             │
│  • IndexedDB caching for offline                          │
│  • Optimistic updates                                      │
└─────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
backend-server/
├── server.js           # Main Express server
├── utils/
│   └── email.js        # Email template loader
├── email-templates/    # HTML email templates
│   ├── invitation.html
│   ├── welcome.html
│   └── ...
└── .env               # Environment variables
```

---

## 💾 Database Structure

### Firebase Realtime Database Schema

```javascript
{
  // ─────────────────────────────────────────────
  // USERS - User profiles and wallet data
  // ─────────────────────────────────────────────
  "users": {
    "$uid": {
      "uid": "string",
      "email": "string",
      "username": "string",       // @username for invites
      "name": "string",
      "phone": "string|null",
      "photoURL": "string|null",
      "paymentDetails": {
        "jazzCash": "string",
        "easypaisa": "string",
        "bankName": "string",
        "accountNumber": "string",
        "raastId": "string"
      },
      "walletBalance": 0,        // Actual money user has
      "settlements": {
        "$groupId": {
          "$memberId": {
            "toReceive": 0,      // They owe you
            "toPay": 0           // You owe them
          }
        }
      },
      "favoriteGroups": ["groupId1", "groupId2"],
      "createdAt": "ISO8601 timestamp"
    }
  },

  // ─────────────────────────────────────────────
  // GROUPS - Expense groups
  // ─────────────────────────────────────────────
  "groups": {
    "$groupId": {
      "id": "string",
      "name": "string",
      "emoji": "string",
      "coverPhoto": "string|null",
      "members": [
        {
          "id": "string",
          "name": "string",
          "userId": "string|null",      // Firebase UID if registered
          "username": "string|null",
          "isTemporary": false,
          "paymentDetails": {},
          "phone": "string|null",
          "isAdmin": true
        }
      ],
      "createdBy": "uid",
      "createdAt": "ISO8601 timestamp"
    }
  },

  // ─────────────────────────────────────────────
  // USER GROUPS - User's group memberships
  // ─────────────────────────────────────────────
  "userGroups": {
    "$uid": {
      "$groupId": {
        "name": "string",
        "emoji": "string",
        "coverPhoto": "string|null",
        "memberCount": 0,
        "role": "admin|member",
        "joinedAt": "ISO8601"
      }
    }
  },

  // ─────────────────────────────────────────────
  // TRANSACTIONS - All transactions
  // ─────────────────────────────────────────────
  "transactions": {
    "$transactionId": {
      "id": "string",
      "groupId": "string",
      "type": "expense|payment|wallet_add|wallet_deduct",
      "title": "string",
      "amount": 0,
      "date": "string",
      "paidBy": "memberId",
      "paidByName": "string",
      "participants": [
        { "id": "string", "name": "string", "amount": 0 }
      ],
      "from": "memberId|null",
      "fromName": "string|null",
      "to": "memberId|null",
      "toName": "string|null",
      "method": "cash|online|null",
      "note": "string|null",
      "place": "string|null",
      "walletBalanceBefore": 0,
      "walletBalanceAfter": 0,
      "createdAt": "ISO8601"
    }
  },

  // ─────────────────────────────────────────────
  // USER TRANSACTIONS - Per-user transaction list
  // ─────────────────────────────────────────────
  "userTransactions": {
    "$uid": {
      "$transactionId": {
        "type": "string",
        "title": "string",
        "amount": 0,
        "createdAt": "ISO8601",
        "groupId": "string",
        "timestamp": 0,
        // For expenses:
        "paidBy": "memberId",
        "paidByName": "string",
        "participants": [],
        "userIsPayer": false,
        "userIsParticipant": false,
        "userShare": 0,
        // For payments:
        "from": "memberId",
        "fromName": "string",
        "to": "memberId",
        "toName": "string",
        "userRole": "payer|receiver"
      }
    }
  },

  // ─────────────────────────────────────────────
  // INVITATIONS - Group invitations
  // ─────────────────────────────────────────────
  "invitations": {
    "$invitationId": {
      "id": "string",
      "groupId": "string",
      "groupName": "string",
      "senderId": "uid",
      "senderName": "string",
      "receiverId": "uid",
      "status": "pending|accepted|declined",
      "createdAt": "ISO8601"
    }
  },

  // ─────────────────────────────────────────────
  // USER INVITATIONS - Per-user invitations
  // ─────────────────────────────────────────────
  "userInvitations": {
    "$uid": {
      "$invitationId": { /* invitation data */ }
    }
  },

  // ─────────────────────────────────────────────
  // USERNAMES - Username lookup index
  // ─────────────────────────────────────────────
  "usernames": {
    "$username": {
      "uid": "string",
      "createdAt": "ISO8601"
    }
  },

  // ─────────────────────────────────────────────
  // EMAIL VERIFICATION - Email verification status
  // ─────────────────────────────────────────────
  "emailVerification": {
    "$uid": {
      "emailVerified": false,
      "createdAt": "ISO8601",
      "verifiedAt": "ISO8601|null"
    }
  },

  // ─────────────────────────────────────────────
  // ONESIGNAL PLAYERS - Push notification tokens
  // ─────────────────────────────────────────────
  "oneSignalPlayers": {
    "$uid": {
      "playerId": "string",
      "updatedAt": "ISO8601"
    }
  },

  // ─────────────────────────────────────────────
  // PROCESSED TRANSACTIONS - Idempotency check
  // ─────────────────────────────────────────────
  "processedTxns": {
    "$clientTxnId": {
      "transactionId": "string",
      "uid": "string",
      "timestamp": 0,
      "createdAt": "ISO8601"
    }
  }
}
```

### IndexedDB Schema (Offline Storage)

```javascript
{
  // Database name: "hostel-ledger-db"
  
  // Offline expenses waiting to sync
  "offline-expenses": {
    key: "id",
    indexes: ["timestamp", "groupId"]
  },
  
  // Offline payments waiting to sync
  "offline-payments": {
    key: "id",
    indexes: ["timestamp", "groupId"]
  },
  
  // Cached groups for offline access
  "cached-groups": {
    key: "id"
  },
  
  // Cached transactions for offline access
  "cached-transactions": {
    key: "id",
    indexes: ["groupId"]
  },
  
  // Miscellaneous app data
  "app-data": {
    key: "key"
  }
}
```

---

## 🔌 API Endpoints

### Backend Server (Express)

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API root - returns API info |
| GET | `/health` | Health check endpoint |
| GET | `/api/push-test` | Test push notification routes |
| POST | `/api/check-email-exists` | Check if email is registered |

#### Authentication Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create-group` | Create a new expense group |
| POST | `/api/add-expense` | Add expense to group |
| POST | `/api/record-payment` | Record payment between members |
| POST | `/api/update-wallet` | Add/deduct from wallet |
| POST | `/api/get-valid-user-details` | Get user by username |
| POST | `/api/send-invitation` | Send group invitation |
| POST | `/api/respond-invitation` | Accept/decline invitation |
| POST | `/api/send-external-invitation` | Invite via email |
| POST | `/api/cleanup-temp-members` | Cleanup expired temp members |

#### Push Notifications (OneSignal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push-subscribe` | Subscribe to notifications |
| POST | `/api/push-notify` | Send notification to user |
| POST | `/api/push-notify-multiple` | Send to multiple users |
| GET | `/api/push-subscription/:userId` | Get subscription status |
| DELETE | `/api/push-unsubscribe/:userId` | Unsubscribe |

#### Email Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/send-email` | Send generic email |
| POST | `/api/send-verification` | Send verification code |
| POST | `/api/send-password-reset` | Send password reset |
| POST | `/api/send-welcome` | Send welcome email |
| POST | `/api/send-transaction-alert` | Transaction notification |

### Request/Response Examples

#### Create Group

```bash
POST /api/create-group
Authorization: Bearer <firebase_id_token>

{
  "name": "Hostel Expenses",
  "emoji": "🏠",
  "members": [
    { "name": "John", "phone": "+1234567890" },
    { "name": "Jane", "phone": "+0987654321" }
  ],
  "invitedUsernames": ["john_doe", "jane_smith"]
}

# Response
{
  "success": true,
  "groupId": "group_abc123",
  "message": "Group created successfully"
}
```

#### Add Expense

```bash
POST /api/add-expense
Authorization: Bearer <firebase_id_token>

{
  "groupId": "group_abc123",
  "amount": 1000,
  "paidBy": "user_123",
  "participants": ["user_123", "user_456", "user_789"],
  "note": "Dinner",
  "place": "Restaurant",
  "clientTxnId": "uuid-v4"
}

# Response
{
  "success": true,
  "transactionId": "txn_xyz789",
  "transaction": { /* transaction object */ }
}
```

---

## 📱 Offline Support

### How It Works

1. **Detection**: App detects offline state via `navigator.onLine`
2. **Caching**: Groups and transactions cached to IndexedDB
3. **Queue**: Offline actions stored locally
4. **Sync**: When online, queued actions sent to server

### Offline Features

- ✅ View all groups and transactions
- ✅ Add expenses (queued for sync)
- ✅ Record payments (queued for sync)
- ✅ View wallet balance
- ✅ User authentication (cached session)

### Sync Logic

```
┌─────────────────────────────────────────────┐
│           Offline Mode Detected             │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Save action to IndexedDB                   │
│  • expenses → offline-expenses              │
│  • payments → offline-payments              │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  Show "Pending Sync" indicator              │
└─────────────────────────────────────────────┘
                      │
                      ▼ (When online)
┌─────────────────────────────────────────────┐
│  Process queue in order                     │
│  • Retry on failure                         │
│  • Mark as synced on success                │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security

### Authentication

- **Firebase Auth**: Secure token-based authentication
- **ID Token Verification**: Server validates Firebase tokens
- **Email Verification**: Optional email verification flow

### Data Protection

- **Input Sanitization**: All user inputs sanitized
- **Rate Limiting**: Prevents abuse
- **Validation**: Zod + custom validation
- **Security Rules**: Firebase database rules

### Firebase Security Rules

```javascript
{
  "rules": {
    // Users can only read/write their own data
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    // Groups: members can read, creator can write
    "groups": {
      "$groupId": {
        ".read": "data.child('members').hasChild(auth.uid)",
        ".write": "data.child('createdBy').val() === auth.uid"
      }
    },
    // Transactions: authenticated users can read/write
    "transactions": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## 🚀 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend (Render/Railway)

1. Create Node.js service
2. Set environment variables
3. Connect GitHub repo
4. Deploy

### Environment Variables

#### Frontend (.env)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=https://your-backend-api.com
VITE_ONESIGNAL_APP_ID=
```

#### Backend (.env)

```
PORT=3000
NODE_ENV=production
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_DATABASE_URL=
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
EMAIL_FROM="Hostel Ledger" <noreply@hostelledger.com>
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
FRONTEND_URL=https://your-frontend.com
```

---

## 📁 Project Structure

```
hostel-ledger/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── backend-server/         # Backend server
│   ├── server.js          # Express app
│   ├── utils/             # Utilities
│   └── email-templates/   # Email HTML
├── public/                # Static assets
├── index.html             # HTML entry
├── package.json           # Dependencies
├── vite.config.ts         # Vite config
└── tailwind.config.ts     # Tailwind config
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests (if configured)
npm run test:e2e
```

### Linting

```bash
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com) - Backend-as-a-Service
- [shadcn/ui](https://ui.shadcn.com) - Beautiful components
- [OneSignal](https://onesignal.com) - Push notifications
- [Zoho Mail](https://www.zoho.com/mail) - Email delivery

---

**Built with ❤️ for hostel communities and shared living spaces**

<p align="center">
  Made with ☕ and 💻 in Pakistan
</p>

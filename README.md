# 🏠 Hostel Wallet - Complete Expense Tracking & Wallet Management

A modern, real-time expense splitting and wallet management app designed for hostel/shared living environments. Built with React, TypeScript, Firebase, and Tailwind CSS.

## ✨ Features

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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd hostel-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Firebase** (Required for real-time features)
   - Follow the detailed guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
   - Copy `.env.example` to `.env` and add your Firebase config

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:8080
   ```

## 🎯 How It Works

### Example Scenario:
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

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Firebase (Authentication + Realtime Database)
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📱 Key Components

### Core Features
- **WalletCard**: Shows actual wallet balance + group balances
- **AddMoneySheet**: Add money to wallet with multiple payment methods
- **PaymentConfirmationSheet**: Pay debts with balance validation
- **AddExpenseSheet**: Smart expense splitting with real-time preview
- **GroupDetail**: Complete group management with member balances

### Smart Logic
- **Automatic wallet deductions** when you pay expenses
- **Proper rounding** that preserves every rupee
- **Duplicate transaction prevention**
- **Insufficient balance warnings**
- **Real-time balance calculations**

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── WalletCard.tsx  # Main wallet display
│   ├── AddMoneySheet.tsx
│   └── ...
├── contexts/           # React contexts
│   ├── FirebaseAuthContext.tsx    # Authentication
│   └── FirebaseDataContext.tsx    # Data management
├── pages/              # Route components
├── lib/                # Utilities
└── hooks/              # Custom hooks
```

## 🔐 Security Features

- **Firebase Authentication**: Secure user management
- **Real-time Database Rules**: Data access control
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error management
- **Offline Support**: Reliable data persistence

## 🌟 Production Ready

### What's Included:
✅ **Complete wallet system** with real money tracking  
✅ **Real-time multi-user collaboration**  
✅ **Comprehensive validation** and error handling  
✅ **Mobile-first responsive design**  
✅ **Firebase integration** for scalability  
✅ **Production deployment** ready  
✅ **Offline support** and data sync  
✅ **Security best practices**  

### Deployment
1. Build the app: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Set environment variables in your hosting platform
4. Update Firebase security rules for production

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for hostel communities and shared living spaces**

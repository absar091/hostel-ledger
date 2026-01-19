# Deploy New Email System

## Overview
The new email system includes three beautiful HTML email templates:
1. **Verification Email** - Sent during signup
2. **Welcome Email** - Sent after email verification  
3. **Transaction Alert** - Sent when transactions are created

## Files Added/Modified

### Backend Server (`backend-server/`)
- ✅ `email-templates/verification.html` - New verification email template
- ✅ `email-templates/welcome.html` - Welcome email template  
- ✅ `email-templates/transaction-alert.html` - Transaction alert template
- ✅ `server.js` - Updated with new endpoints and template loading

### Frontend (`src/`)
- ✅ `lib/email.ts` - Added new email functions
- ✅ `lib/transactionNotifications.ts` - New transaction notification system
- ✅ `pages/VerifyEmail.tsx` - Updated to send welcome email after verification

### New Backend Endpoints
- `POST /api/send-welcome` - Send welcome email
- `POST /api/send-transaction-alert` - Send transaction alert
- `POST /api/send-verification-new` - Send verification with new template

## Deployment Steps

### Step 1: Deploy Backend to Vercel
```bash
cd backend-server
vercel --prod
```

### Step 2: Test New Endpoints
```bash
node test-new-email-system.js
```

### Step 3: Update Frontend Environment
Make sure your frontend is pointing to the correct backend URL:
```env
VITE_API_URL=https://hostel-ledger-backend.vercel.app
```

## Integration Points

### 1. Signup Flow
- User creates account → Verification email (new template)
- User verifies email → Welcome email sent automatically

### 2. Transaction Flow  
- User creates expense → Transaction alert sent to all group members
- Use `sendTransactionNotifications()` function from `transactionNotifications.ts`

### 3. Example Usage

#### Send Welcome Email
```typescript
import { sendWelcomeEmail } from '@/lib/email';

await sendWelcomeEmail('user@example.com', 'John Doe');
```

#### Send Transaction Alert
```typescript
import { sendTransactionNotifications } from '@/lib/transactionNotifications';

const transaction = {
  id: 'tx123',
  type: 'expense',
  title: 'Grocery Shopping',
  amount: 1500,
  groupId: 'group123',
  groupName: 'Hostel Room 101',
  paidBy: 'user123',
  paidByName: 'John Doe',
  participants: ['user123', 'user456', 'user789'],
  date: new Date().toISOString(),
  description: 'Weekly grocery shopping'
};

const users = [
  { uid: 'user456', email: 'jane@example.com', name: 'Jane Smith' },
  { uid: 'user789', email: 'bob@example.com', name: 'Bob Johnson' }
];

await sendTransactionNotifications(transaction, users);
```

## Email Template Variables

### Verification Email
- `{{USER_NAME}}` - User's full name
- `{{CODE}}` - 6-digit verification code

### Welcome Email  
- `{{USER_NAME}}` - User's full name

### Transaction Alert
- `{{USER_NAME}}` - Recipient's name
- `{{TRANSACTION_TYPE}}` - Type of transaction (New Expense, Payment, etc.)
- `{{AMOUNT}}` - Formatted amount (Rs 1,500)
- `{{GROUP_NAME}}` - Name of the group
- `{{DATE}}` - Formatted date and time
- `{{DESCRIPTION}}` - Transaction description

## Testing

### Manual Testing
1. **Verification Email**: Sign up for a new account
2. **Welcome Email**: Complete email verification  
3. **Transaction Alert**: Create a new expense in a group

### Automated Testing
```bash
node test-new-email-system.js
```

## Troubleshooting

### Common Issues
1. **Templates not loading**: Check if `email-templates/` directory exists in deployed backend
2. **Variables not replaced**: Ensure template variables use `{{VARIABLE}}` format
3. **Emails not sending**: Check SMTP configuration in backend environment variables

### Debug Steps
1. Check backend logs in Vercel dashboard
2. Test individual endpoints with curl or Postman
3. Verify email templates are properly formatted HTML

## Environment Variables Required

### Backend (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Hostel Ledger <noreply@yourdomain.com>
```

### Frontend (.env)
```env
VITE_API_URL=https://hostel-ledger-backend.vercel.app
```

## Next Steps After Deployment

1. **Test Complete Flow**: Sign up → Verify → Create transaction
2. **Monitor Email Delivery**: Check spam folders, delivery rates
3. **Add User Preferences**: Allow users to control email notifications
4. **Analytics**: Track email open rates and engagement
5. **Localization**: Add support for multiple languages

## Success Criteria

✅ All three email templates render correctly  
✅ Backend endpoints respond successfully  
✅ Frontend integration works seamlessly  
✅ Emails are delivered to recipients  
✅ No errors in production logs  

The new email system provides a professional, branded experience for all user communications!
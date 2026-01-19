# Technical Specification - Enterprise Expense Tracker (CORRECTED)

## Data Model Specification

### User Profile Schema
```typescript
interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  paymentDetails: PaymentDetails;
  availableBudget: number;     // Real money (actual wallet/bank balance)
  netBalance: number;          // Expected money after settlements
  settlements: {
    [personId: string]: {
      toReceive: number;         // Money others owe this user
      toPay: number;            // Money this user owes others
    }
  };
  createdAt: string;
}
```

### Financial Invariant (CRITICAL)
```typescript
// This MUST always be true
netBalance = availableBudget + totalToReceive - totalToPay

// Where:
totalToReceive = sum(settlements[*].toReceive)
totalToPay = sum(settlements[*].toPay)
```

## Financial Operations Specification

### Operation 1: Add Money to Budget
```typescript
function addMoneyToBudget(amount: number) {
  // Both balances increase by same amount
  user.availableBudget += amount;
  user.netBalance += amount;
  
  // DO NOT touch settlements
}
```

### Operation 2: Add Expense (User Pays)
```typescript
function addExpenseUserPays({
  totalAmount: number,
  participants: string[],
  userShare: number
}) {
  // Step 1: Deduct FULL amount from available budget (real money spent)
  user.availableBudget -= totalAmount;
  
  // Step 2: Deduct only USER'S SHARE from net balance
  user.netBalance -= userShare;
  
  // Step 3: Create receivables for others' shares
  participants.forEach(personId => {
    if (personId !== user.uid) {
      const theirShare = calculateShare(totalAmount, participants, personId);
      user.settlements[personId].toReceive += theirShare;
    }
  });
  
  // Net balance invariant maintained:
  // netBalance = availableBudget + toReceive - toPay
  // After: (oldNet - userShare) = (oldAvailable - totalAmount) + (othersShares) - toPay
}
```

### Operation 3: Add Expense (Others Pay)
```typescript
function addExpenseOthersPay({
  payerId: string,
  userShare: number
}) {
  // Step 1: Available budget unchanged (user didn't pay)
  // user.availableBudget = unchanged
  
  // Step 2: Deduct user's share from net balance (user now owes money)
  user.netBalance -= userShare;
  
  // Step 3: Create debt to payer
  user.settlements[payerId].toPay += userShare;
  
  // Net balance invariant maintained:
  // netBalance = availableBudget + toReceive - toPay
  // After: (oldNet - userShare) = availableBudget + toReceive - (oldToPay + userShare)
}
```

### Operation 4: Pay Debt
```typescript
function payDebt(personId: string, amount: number) {
  // Validation
  if (user.availableBudget < amount) {
    throw new Error("Insufficient available budget");
  }
  
  // Step 1: Deduct real money
  user.availableBudget -= amount;
  
  // Step 2: Increase net balance (debt reduction improves net position)
  user.netBalance += amount;
  
  // Step 3: Reduce debt
  user.settlements[personId].toPay -= amount;
  
  // Net balance invariant maintained:
  // netBalance = availableBudget + toReceive - toPay
  // After: (oldNet + amount) = (oldAvailable - amount) + toReceive - (oldToPay - amount)
}
```

### Operation 5: Mark Payment Received
```typescript
function markPaymentReceived(personId: string, amount: number) {
  // Step 1: Add real money
  user.availableBudget += amount;
  
  // Step 2: Net balance unchanged (was already counted in expectation)
  // user.netBalance = unchanged
  
  // Step 3: Reduce receivable
  user.settlements[personId].toReceive -= amount;
  
  // Net balance invariant maintained:
  // netBalance = availableBudget + toReceive - toPay
  // After: oldNet = (oldAvailable + amount) + (oldToReceive - amount) - toPay
}
```

## UI Component Specifications

### WalletCard Component
```typescript
interface WalletCardProps {
  availableBudget: number;     // From user.availableBudget
  netBalance: number;          // From user.netBalance
  totalToReceive: number;      // Calculated: sum(settlements[*].toReceive)
  totalToPay: number;          // Calculated: sum(settlements[*].toPay)
}

// Display Logic
- Top Section: "Available Budget" shows availableBudget (most prominent)
- Middle Section: "Net Balance" shows netBalance
- Bottom Left: "You'll Receive" shows totalToReceive (green)
- Bottom Right: "You Owe" shows totalToPay (red)
```

### GroupMember Component
```typescript
interface GroupMemberProps {
  member: {
    id: string;
    name: string;
    toReceive: number;  // From user.settlements[member.id].toReceive
    toPay: number;      // From user.settlements[member.id].toPay
  }
}

// Action Buttons Logic
if (member.toPay > 0) {
  showButton("Pay Rs ${member.toPay}", () => payDebt(member.id, member.toPay));
}

if (member.toReceive > 0) {
  showButton("Mark Received", () => markPaymentReceived(member.id, member.toReceive));
}
```

## User's Exact Example Walkthrough

### Initial State
```
Add Rs 60,000 to wallet:
- Available Budget: Rs 60,000
- Net Balance: Rs 60,000
- You'll Receive: Rs 0
- You Owe: Rs 0
```

### Scenario 1: User pays Rs 6,000 for 3 people
```
Each person's share: Rs 2,000
User pays full Rs 6,000:

- Available Budget: Rs 54,000 (60,000 - 6,000 full amount)
- Net Balance: Rs 58,000 (60,000 - 2,000 user's share)
- You'll Receive: Rs 4,000 (Ali: 2,000 + Hassan: 2,000)
- You Owe: Rs 0

Verification: 58,000 = 54,000 + 4,000 - 0 ✓
```

### Scenario 2: Ali pays Rs 6,000 for 3 people
```
User's share: Rs 2,000
Ali pays full Rs 6,000:

- Available Budget: Rs 54,000 (unchanged - user didn't pay)
- Net Balance: Rs 56,000 (58,000 - 2,000 user's debt)
- You'll Receive: Rs 4,000 (unchanged)
- You Owe: Rs 2,000 (to Ali)

Verification: 56,000 = 54,000 + 4,000 - 2,000 ✓
```

### Scenario 3: User pays Rs 2,000 debt to Ali
```
- Available Budget: Rs 52,000 (54,000 - 2,000 payment)
- Net Balance: Rs 56,000 (unchanged - debt was already counted)
- You'll Receive: Rs 4,000 (unchanged)
- You Owe: Rs 0 (2,000 - 2,000 payment)

Verification: 56,000 = 52,000 + 4,000 - 0 ✓
```

### Scenario 4: Ali pays user Rs 2,000
```
- Available Budget: Rs 54,000 (52,000 + 2,000 received)
- Net Balance: Rs 56,000 (unchanged - was already counted)
- You'll Receive: Rs 2,000 (4,000 - 2,000 received)
- You Owe: Rs 0 (unchanged)

Verification: 56,000 = 54,000 + 2,000 - 0 ✓
```

## Database Schema

### Firebase Realtime Database Structure
```json
{
  "users": {
    "userId": {
      "availableBudget": 60000,
      "netBalance": 60000,
      "settlements": {
        "ali": {
          "toReceive": 200,
          "toPay": 300
        },
        "hassan": {
          "toReceive": 200,
          "toPay": 0
        }
      }
    }
  }
}
```

## Critical Implementation Notes

1. **Net Balance is NOT calculated** - it's stored and maintained
2. **Available Budget tracks real money only**
3. **Net Balance tracks expected money after settlements**
4. **The invariant MUST be maintained after every operation**
5. **UI shows all four values clearly**
6. **No auto-offsetting between toReceive and toPay**

This specification fixes the current implementation issues and matches your exact financial logic.
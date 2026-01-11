# Final UI Wording Specification

## 🎯 Purpose
Clear, unambiguous labels that prevent user confusion and match enterprise-grade financial logic.

## 🏦 TOP SECTION (Most Important)

### Current Problem
```
Rs 59,800
For expense tracking
```
❌ "For expense tracking" is vague
❌ Users think this includes group money

### ✅ FINAL WORDING
```
🏦 Available Budget
Rs 59,800
Actual money you have right now
```

**Helper Text:** Small, grey text below amount
**Tooltip/Info:** "This is your real cash or wallet balance. It changes only when you pay or receive money."
**User Understanding:** "This is my real money. Nothing fake here."

## 🔄 MIDDLE SECTION (Settlement Status)

### Current Problem
```
Net Balance (Group Settlements)
```
❌ "Net Balance" sounds like cash
❌ Causes 90% of user confusion

### ✅ FINAL WORDING
```
🔄 Settlement Delta
+Rs 400 / −Rs 300 / Rs 0
Pending group settlements
```

**Helper Text:** "Pending group settlements"
**Tooltip/Info:** "Shows how much money is still pending in groups. Positive (+) means others need to pay you. Negative (−) means you need to pay others. This is not real money yet."
**User Understanding:** "This is expected money, not in my pocket yet."

## 📥 YOU'LL RECEIVE CARD (Bottom Left, Green)

### Current Wording (Good, but can improve)
```
You'll Receive
```

### ✅ IMPROVED WORDING
```
📥 You'll Receive
Rs 400
Money others owe you
```

**Helper Text:** "Money others owe you"
**Tooltip/Info:** "This is money you paid on behalf of others. Your available budget will increase only after you mark 'Received'."
**User Understanding:** "People owe me this much."

## 📤 YOU OWE CARD (Bottom Right, Red)

### Current Wording (Good, but needs clarity)
```
You Owe
```

### ✅ IMPROVED WORDING
```
📤 You Owe
Rs 300
Money you need to pay
```

**Helper Text:** "Money you need to pay"
**Tooltip/Info:** "This is money others paid on your behalf. Your available budget will decrease only after you mark 'Paid'."
**User Understanding:** "I need to give this money."

## 🔘 BUTTON WORDING (Critical for Actions)

### Current Buttons
- Add Expense
- Received
- New Group

### ✅ IMPROVED BUTTON LABELS

**Primary Actions:**
```
➕ Add Expense
   Split a new group expense

✅ Mark Received
   Money received from someone

💸 Mark Paid
   Money paid to someone

👥 Create Group
   (instead of "New Group")
```

## 📋 TRANSACTION LIST WORDING

### Current Format
```
Paid by You
Ali owes Rs 200
```

### ✅ RECOMMENDED FORMAT
```
☕ Chai — Rs 600
Paid by you
• Ali owes you Rs 200
• Hassan owes you Rs 200

🍽 Dinner — Rs 900
Paid by Ali
• You owe Ali Rs 300
```

**Benefits:**
- Clear subject + direction
- No extra noise
- No mixing of debts

## 👤 PERSON DETAIL VIEW (When user taps a member)

### ✅ ENTERPRISE-LEVEL DETAIL
```
👤 Ali — Settlement Details

Ali owes you: Rs 200
You owe Ali: Rs 300

Actions:
[Mark Received Rs 200]
[Mark Paid Rs 300]
```

**Key Point:** This reinforces no auto-mixing of debts

## 🎨 COLOR CODING SYSTEM

### Available Budget
- **Color:** Primary blue/black (most important)
- **Size:** Largest font
- **Style:** Bold, prominent

### Settlement Delta
- **Positive (+):** Green
- **Negative (−):** Red  
- **Zero (0):** Grey
- **Style:** Medium font, clear +/− symbols

### You'll Receive
- **Color:** Green background/border
- **Icon:** 📥 (incoming arrow)
- **Style:** Positive, hopeful

### You Owe
- **Color:** Red background/border
- **Icon:** 📤 (outgoing arrow)
- **Style:** Alert, needs attention

## 🔒 TERMINOLOGY MAPPING

| Internal Name | UI Label | Helper Text |
|---------------|----------|-------------|
| `availableBudget` | Available Budget | Actual money you have right now |
| `settlementDelta` | Settlement Delta | Pending group settlements |
| `settlements.toReceive` | You'll Receive | Money others owe you |
| `settlements.toPay` | You Owe | Money you need to pay |

## 🚨 EMPTY STATE MESSAGES

### No Groups
```
👥 No groups yet
Create your first group to start tracking expenses with friends
[Create Group]
```

### No Transactions
```
📝 No expenses yet
Add your first expense to start splitting costs
[Add Expense]
```

### All Settled
```
🎉 All settled!
No pending payments in this group
```

## ⚠️ ERROR MESSAGES

### Insufficient Funds
```
💰 Insufficient Available Budget
You need Rs 500 but only have Rs 300 available
[Add Money] [Cancel]
```

### Invalid Amount
```
❌ Invalid Amount
Please enter a valid amount greater than Rs 0
```

### Network Error
```
🌐 Connection Error
Please check your internet and try again
[Retry]
```

## 🧠 WHY THIS UI WORDING WORKS

✅ **No financial ambiguity** - Each term has one clear meaning
✅ **Matches real-world thinking** - Users understand immediately  
✅ **Explains logic without teaching accounting** - Self-explanatory
✅ **Safe for students & hostel use** - No complex financial jargon
✅ **Scales to enterprise users** - Professional terminology
✅ **Prevents confusion between:**
   - Cash vs expectation
   - Paid vs owed  
   - Expense vs settlement

## 🏁 IMPLEMENTATION PRIORITY

1. **CRITICAL:** Fix "Available Budget" label (removes 90% confusion)
2. **CRITICAL:** Change "Net Balance" to "Settlement Delta" 
3. **HIGH:** Add helper text under each amount
4. **HIGH:** Improve button labels ("Mark Received", "Mark Paid")
5. **MEDIUM:** Add tooltips/info icons
6. **LOW:** Implement color coding system

This wording system ensures your app is crystal clear for users while maintaining enterprise-grade financial accuracy.
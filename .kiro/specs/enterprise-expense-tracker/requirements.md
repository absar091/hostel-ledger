# Requirements Document - Enterprise Expense Tracker

## Introduction

A personal expense tracking application with enterprise-grade financial logic that maintains strict separation between actual money (Available Budget) and expected money after settlements (Net Balance). Each user manages their own account while tracking expenses with friends/roommates who don't have accounts.

## Enterprise-Grade Financial Logic (FINAL SPEC)

### 🔒 UI Section Definitions

**1️⃣ Available Budget** (Top, Most Prominent)
- **Internal:** `availableBudget`
- **Meaning:** Real money you currently have (wallet/bank/cash)
- **Rule:** Changes ONLY when money is actually paid or received
- **UI Label:** "Available Budget" + "Actual money you have right now"

**2️⃣ Settlement Delta** (Middle Section)
- **Internal:** `settlementDelta = totalToReceive - totalToPay`
- **Meaning:** Pending impact of group expenses (expectation, not money)
- **UI Label:** "Settlement Delta" + "Pending group settlements"

**3️⃣ You'll Receive** (Bottom Left, Green)
- **Internal:** `sum(settlements[*].toReceive)`
- **Meaning:** Money others owe you (not yet received)
- **UI Label:** "You'll Receive" + "Money others owe you"

**4️⃣ You Owe** (Bottom Right, Red)
- **Internal:** `sum(settlements[*].toPay)`
- **Meaning:** Money you owe to others (not yet paid)
- **UI Label:** "You Owe" + "Money you need to pay"

### 🧪 Complete Flow Example

**Step 1:** Add Rs 60,000
```
Available Budget: 60,000
Settlement Delta: 0
You'll Receive: 0
You Owe: 0
```

**Step 2:** You pay Rs 600 chai for 3 people (Rs 200 each)
```
availableBudget -= 600  // Real money spent
settlements.Ali.toReceive += 200
settlements.Hassan.toReceive += 200

Result:
Available Budget: 59,400
You'll Receive: 400
You Owe: 0
Settlement Delta: +400
```

**Step 3:** Ali pays Rs 900 dinner for 3 people (your share Rs 300)
```
settlements.Ali.toPay += 300  // You owe Ali

Result:
Available Budget: 59,400 (unchanged)
You'll Receive: 400 (unchanged)
You Owe: 300
Settlement Delta: +100 (400 - 300)
```

## Glossary

- **Available_Budget**: Real money you currently have (wallet/bank/cash)
- **Settlement_Delta**: Pending impact of group expenses (positive = will receive, negative = owe)
- **You_Will_Receive**: Sum of money others owe you (not yet received)
- **You_Owe**: Sum of money you owe to others (not yet paid)
- **Per_Person_Ledger**: Individual tracking of toReceive/toPay amounts per group member (NEVER auto-merged)
- **Group_Member**: Person in expense group (name only, no account required)
- **Expense_Tracker**: The main system managing all financial operations

### 🚨 CRITICAL ENTERPRISE INVARIANTS
1. **Available Budget = real cash only** (changes only on actual payments)
2. **Settlement Delta = expectation only** (calculated: toReceive - toPay)
3. **Per-person ledgers are never auto-merged** (Ali: toReceive=200, toPay=300 stays separate)
4. **Every settlement requires explicit user action** (tap "Paid" or "Received")
5. **UI displays stored values, never performs financial calculations**

## Requirements

### Requirement 1: Financial Data Model

**User Story:** As a developer, I want a strict financial data model, so that money tracking is enterprise-safe and audit-compliant.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL store availableBudget as a single number representing real money
2. THE Expense_Tracker SHALL store per-person settlements with toReceive and toPay amounts
3. THE Expense_Tracker SHALL maintain settlementDelta = totalToReceive - totalToPay invariant
4. THE Expense_Tracker SHALL never auto-merge or auto-offset per-person ledgers
5. THE Expense_Tracker SHALL validate that UI calculations match stored values exactly

### Requirement 2: Money Addition Operations

**User Story:** As a user, I want to add money to my budget, so that I can track my available funds for expenses.

#### Acceptance Criteria

1. WHEN a user adds money to wallet, THE Expense_Tracker SHALL increase availableBudget by the exact amount
2. WHEN money is added, THE Expense_Tracker SHALL not modify any settlement values
3. THE Expense_Tracker SHALL update only availableBudget and leave settlementDelta unchanged
4. THE Expense_Tracker SHALL persist the new availableBudget to database immediately
5. THE Expense_Tracker SHALL display the updated Available Budget in the UI

### Requirement 3: Expense Creation (User Pays)

**User Story:** As a user, I want to record expenses I paid for, so that I can track what others owe me.

#### Acceptance Criteria

1. WHEN user pays an expense, THE Expense_Tracker SHALL deduct full expense amount from availableBudget
2. WHEN user pays an expense, THE Expense_Tracker SHALL deduct only user's share from netBalance
3. WHEN user pays an expense, THE Expense_Tracker SHALL create toReceive entries for each other participant's share
4. THE Expense_Tracker SHALL not create toPay entries when user is the payer
5. THE Expense_Tracker SHALL display correct "You'll Receive" amount in UI

**Example:** User pays Rs 6,000 for 3 people
- Available Budget: -Rs 6,000 (full amount paid)
- Net Balance: -Rs 2,000 (only user's share)
- You'll Receive: +Rs 4,000 (others' shares)

### Requirement 4: Expense Creation (Others Pay)

**User Story:** As a user, I want to record expenses others paid for, so that I can track what I owe them.

#### Acceptance Criteria

1. WHEN someone else pays an expense, THE Expense_Tracker SHALL not modify availableBudget
2. WHEN someone else pays an expense, THE Expense_Tracker SHALL deduct user's share from netBalance
3. WHEN someone else pays an expense, THE Expense_Tracker SHALL create toPay entry for user's share to the payer
4. THE Expense_Tracker SHALL not modify existing toReceive amounts
5. THE Expense_Tracker SHALL display correct "You Owe" amount in UI

**Example:** Ali pays Rs 6,000 for 3 people (user owes Rs 2,000)
- Available Budget: unchanged (user didn't pay)
- Net Balance: -Rs 2,000 (user's debt)
- You Owe: +Rs 2,000 (to Ali)

### Requirement 5: Debt Payment Operations

**User Story:** As a user, I want to pay my debts, so that I can settle what I owe to others.

#### Acceptance Criteria

1. WHEN user pays a debt, THE Expense_Tracker SHALL deduct payment amount from availableBudget
2. WHEN user pays a debt, THE Expense_Tracker SHALL add payment amount to netBalance (debt reduction)
3. WHEN user pays a debt, THE Expense_Tracker SHALL reduce corresponding toPay amount
4. THE Expense_Tracker SHALL not modify toReceive amounts during debt payment
5. THE Expense_Tracker SHALL require sufficient availableBudget before allowing payment

**Example:** User pays Rs 2,000 debt to Ali
- Available Budget: -Rs 2,000 (real money paid)
- Net Balance: +Rs 2,000 (debt cleared)
- You Owe: -Rs 2,000 (debt to Ali cleared)

### Requirement 6: Payment Receipt Operations

**User Story:** As a user, I want to mark when others pay me, so that I can track received settlements.

#### Acceptance Criteria

1. WHEN user marks payment as received, THE Expense_Tracker SHALL increase availableBudget
2. WHEN payment is received, THE Expense_Tracker SHALL not change netBalance (already accounted for)
3. WHEN payment is received, THE Expense_Tracker SHALL reduce corresponding toReceive amount
4. THE Expense_Tracker SHALL not modify toPay amounts during payment receipt
5. THE Expense_Tracker SHALL maintain audit trail of all payment receipts

**Example:** Ali pays user Rs 2,000
- Available Budget: +Rs 2,000 (real money received)
- Net Balance: unchanged (was already counted in net balance)
- You'll Receive: -Rs 2,000 (Ali's debt cleared)

### Requirement 7: UI Financial Display

**User Story:** As a user, I want clear financial summaries, so that I understand my money situation at a glance.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL display Available Budget as the top prominent amount (real money)
2. THE Expense_Tracker SHALL display Net Balance as expected money after settlements
3. THE Expense_Tracker SHALL display "You'll Receive" as sum of all toReceive amounts
4. THE Expense_Tracker SHALL display "You Owe" as sum of all toPay amounts
5. THE Expense_Tracker SHALL validate that Net Balance = Available Budget + You'll Receive - You Owe

**UI Layout:**
- Top: "Available Budget" (most prominent)
- Middle: "Net Balance" (calculated expectation)
- Bottom Left: "You'll Receive" (green)
- Bottom Right: "You Owe" (red)

### Requirement 8: Enterprise Data Integrity

**User Story:** As a system administrator, I want strict data integrity rules, so that financial data remains consistent and auditable.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL never perform automatic settlement offsetting
2. THE Expense_Tracker SHALL maintain separate toReceive and toPay ledgers per person
3. THE Expense_Tracker SHALL require explicit user action for all balance changes
4. THE Expense_Tracker SHALL validate all financial invariants before database writes
5. THE Expense_Tracker SHALL log all financial operations for audit compliance

### Requirement 9: Group Member Management

**User Story:** As a user, I want to manage group members, so that I can track expenses with friends and roommates.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL allow adding group members by name only (no accounts required)
2. THE Expense_Tracker SHALL maintain separate financial ledgers per group member
3. THE Expense_Tracker SHALL display individual balances for each group member
4. THE Expense_Tracker SHALL provide payment action buttons based on member balance status
5. THE Expense_Tracker SHALL preserve transaction history when members are removed

### Requirement 10: Transaction History and Audit

**User Story:** As a user, I want complete transaction history, so that I can review all financial activities.

#### Acceptance Criteria

1. THE Expense_Tracker SHALL record all financial operations with timestamps
2. THE Expense_Tracker SHALL maintain immutable transaction logs
3. THE Expense_Tracker SHALL display transaction history in chronological order
4. THE Expense_Tracker SHALL show detailed breakdown of each expense split
5. THE Expense_Tracker SHALL provide export functionality for financial records
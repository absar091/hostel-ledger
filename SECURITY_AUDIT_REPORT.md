# 🛡️ Security Audit Report - Hostel Ledger

**Date:** 2026-02-18
**Auditor:** Jules (AI Security Engineer)
**Scope:** Backend API, Database Interactions, and Financial Logic.

## 🚨 Executive Summary

A comprehensive security audit and simulated attack on the **Hostel Ledger** application has revealed **3 Critical/High** vulnerabilities that could lead to financial manipulation, data integrity loss, and denial of service. The most severe issue allows users to artificially inflate their wallet balances by submitting negative expense amounts.

All findings have been verified with reproduction scripts (`backend-server/tests/unit/security_audit.test.js`).

---

## 🔍 Findings

### 1. Negative Amount Injection (Critical)

**Endpoint:** `POST /api/add-expense` and `POST /api/record-payment`
**Severity:** **CRITICAL** 🔴
**Location:** `backend-server/server.js` (Lines ~1860, ~2150)

**Description:**
The application fails to validate that the `amount` field is a positive number. By sending a negative amount (e.g., `-5000`), an attacker can reverse the flow of money in the system logic.
- **Exploit:**
    - Attacker calls `add-expense` with `amount: -5000`.
    - Backend logic: `walletBalanceAfter -= amount` becomes `walletBalanceAfter -= -5000` (Addition).
    - Database update: `ServerValue.increment(-amount)` becomes `increment(5000)`.
    - **Result:** Attacker gains 5,000 in their wallet, and debts are calculated incorrectly (likely creating credit where debt should exist).

**Proof of Concept:**
```javascript
// Validated by security_audit.test.js
await request(app)
  .post('/api/add-expense')
  .send({
    groupId: '...',
    amount: -5000, // Malicious payload
    paidBy: 'attacker',
    participants: ['victim']
  });
// Server responds 200 OK
// Attacker wallet increases by 5000.
```

**Recommendation:**
Add strict input validation to ensure `amount > 0` for all financial endpoints.
```javascript
if (typeof amount !== 'number' || amount <= 0) {
  return res.status(400).json({ error: 'Amount must be a positive number' });
}
```

---

### 2. P2P Fund Transfer Logic Flaw (High)

**Endpoint:** `POST /api/send-money`
**Severity:** **HIGH** 🟠
**Location:** `backend-server/server.js` (P2P Section)

**Description:**
The `send-money` endpoint creates a pending transaction request. While it checks if `amount > 0`, it **does not check if the sender has sufficient funds** at the time of creation.
Furthermore, the `respond-money-request` endpoint (which executes the transfer) calculates the new balance but **does not verify if the sender's resulting balance is non-negative** before applying the update.
- **Exploit:**
    - Attacker with `0` balance sends a request for `1,000,000` to a friend (or alt account).
    - Receiver accepts the request.
    - **Result:** Sender's balance becomes `-1,000,000`. Receiver's balance becomes `1,000,000`. The receiver can now withdraw or spend this "fake" money.

**Proof of Concept:**
```javascript
// Validated by security_audit.test.js
await request(app).post('/api/send-money').send({ amount: 1000 }); // Sender has 100
// Server responds 200 OK (Request Created)
// If accepted, funds move despite insolvency.
```

**Recommendation:**
1.  Check sender's balance in `send-money` before creating the request.
2.  Re-check sender's balance atomically in `respond-money-request` using a Firebase Transaction (not just `update` with `increment`) or a precondition check.

---

### 3. Missing Transaction Limits (Medium)

**Endpoint:** All financial endpoints
**Severity:** **MEDIUM** 🟡

**Description:**
There is no upper limit on transaction amounts in the backend. An attacker could send `1e20` (or the max safe integer) to cause integer overflows or render the UI unusable with massive numbers.

**Recommendation:**
Enforce a maximum transaction limit (e.g., 1,000,000) consistent with the frontend validation.

---

### 4. Potential Denial of Service (Low)

**Endpoint:** `POST /api/add-expense`
**Severity:** **LOW** 🔵

**Description:**
The `participants` array is not capped. A malicious user could send an expense with 10,000 participants, causing high CPU usage during settlement calculation and potential database timeouts.

**Recommendation:**
Limit the number of participants per transaction (e.g., max 50 or 100).

---

## 🛠️ Next Steps

1.  **Immediate Fix:** Apply patches for Vulnerability #1 and #2 to prevent active exploitation.
2.  **Validation Layer:** Implement a centralized request validation middleware (using Joi or Zod) for all endpoints.
3.  **Comprehensive Testing:** Expand the test suite to cover edge cases for all financial transactions.

**Signed,**
*Jules*

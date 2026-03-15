## 2024-05-19 - Missing memoization for expensive and frequently called functions
**Learning:** Found that `getTotalToReceive`, `getTotalToPay`, `getSettlementDelta` and `getSettlements` inside `FirebaseAuthContext` were recreated on every render despite being complex calculations and dependent only on the user's settlements. This causes performance issues as they are used in contexts and several components (e.g. `WalletCard`, `Dashboard`).
**Action:** Wrapped these functions in `useCallback` to prevent unnecessary re-creations. Also wrapped `getWalletBalance`.

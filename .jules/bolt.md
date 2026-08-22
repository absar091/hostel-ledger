## 2024-05-30 - Fix useMemo Dependency Exhaustiveness
**Learning:** Found a missing useCallback wrapping on `getTransactionsByGroup` in FirebaseDataContext causing exhaustive dependency warnings and potential React hook re-evaluations.
**Action:** Wrapped getTransactionsByGroup, getTransactionsByMember, and getAllTransactions in useCallback to improve React context performance.

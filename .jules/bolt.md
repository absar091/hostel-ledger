## 2024-10-09 - Memoize context exported functions
**Learning:** Functions exported from Context providers (like getTransactionsByGroup) recreate on every render if not wrapped in useCallback, causing widespread unnecessary re-renders in consumer components.
**Action:** Always wrap functions exposed in React Context with useCallback to ensure stable references.

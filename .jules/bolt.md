## 2024-06-25 - Memoize FirebaseAuthContext Provider Value
**Learning:** Large context providers like FirebaseAuthContext passing object literals directly to `value` cause continuous cascading re-renders in all consumers, severely impacting frontend performance.
**Action:** Always wrap context provider value objects in `useMemo` with minimal required dependencies to ensure reference equality across renders.

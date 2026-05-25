## 2025-05-25 - Context Function Array Return Memoization
**Learning:** Exposing context functions that perform array operations (like `.filter()`) and failing to memoize them causes severe performance degradation in consumer components, as inline `useMemo` hooks relying on those return values recompute on every render due to changing array references.
**Action:** Always wrap context helper functions in `useCallback`, and strictly wrap consumer-side array assignments from those functions in `useMemo` to stabilize downstream dependencies.

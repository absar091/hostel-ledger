## 2025-05-18 - Context Stability & List Performance
**Learning:** Functions returned by Context Providers (like `getTransactionsByGroup`) are re-created on every render unless wrapped in `useCallback`. This breaks `useMemo` optimizations in consumers even if data hasn't changed. Always wrap context functions in `useCallback`.
**Action:** When creating Context Providers, wrap exposed functions in `useCallback` to ensure referential stability for consumers.

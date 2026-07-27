## 2024-05-18 - Prevent TimelineItem Re-renders in GroupDetail
**Learning:** Inline array mapping (e.g., `payers.map(...)`) passed as props defeats `React.memo` by creating new references on every parent render, causing unnecessary O(N) re-renders in list components.
**Action:** Always wrap data derivation loops in `useMemo` at the parent level before mapping over list components.

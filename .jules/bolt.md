## 2025-08-01 - Avoid breaking React.memo with inline empty arrays
**Learning:** Using an inline array `[]` as a fallback value (e.g., `const data = id ? getData(id) : []`) breaks `React.memo` and `useMemo` hooks because a new array reference is created on every render, causing unnecessary child re-renders.
**Action:** Define a constant `const EMPTY_ARRAY = []` outside the component and use it as the fallback to maintain a stable reference.

## 2026-07-07 - Prevented broken React.memo in Dashboard
**Learning:** Passing inline derivations like `.slice()` or `.map()` as props to a memoized list component (like `TransactionList`) creates a new array reference on every render, completely defeating the memoization.
**Action:** Always wrap array manipulations in `useMemo` before passing them to memoized child components.

## 2026-07-07 - Optimized O(N) array transformations
**Learning:** Chaining `.map()` and `Object.fromEntries()` to convert arrays to lookup maps creates unnecessary intermediate array allocations, slowing down performance for large datasets.
**Action:** Use a single-pass `.reduce()` to directly build the lookup dictionary without intermediate arrays.

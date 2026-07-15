## 2024-07-15 - Prevent Unnecessary Re-renders in Dashboard TransactionList

**Learning:** `allTransactions.slice(0, 5)` was being passed directly to `TransactionList` as a prop in `Dashboard.tsx`. Because `slice()` creates a new array reference on every render, it entirely defeated the `memo()` optimization on `TransactionList`, causing the entire list and its children to re-render whenever the Dashboard state updated (e.g. tooltip states, scroll position). Additionally, `Object.fromEntries(groups.map(...))` was used in `Activity.tsx` creating an unnecessary intermediate array during the transform which can be optimized with `.reduce()`. Also, `TransactionList` was not utilizing `React.memo()`.

**Action:**
1. Use `useMemo` for any derived arrays passed as props to memoized child components, or move the derivation logic out of the render loop.
2. Ensure large/frequent lists are wrapped in `React.memo()` to capitalize on reference-stable props.
3. Use `.reduce()` instead of chaining `.map()` and `Object.fromEntries()` for object creation from arrays to reduce memory overhead and garbage collection in render loops.

## 2024-03-19 - Missing React.memo on Large List Components
**Learning:** In complex React applications, components that render large lists of elements (like `TransactionList`) should almost always be wrapped in `React.memo` when their parent components frequently re-render and calculate derived state. Without memoization, the entire list DOM tree is unnecessarily re-evaluated even when props haven't changed.
**Action:** Always check if list-rendering components have `React.memo` applied, especially if they map over arrays of objects that are already memoized in the parent.

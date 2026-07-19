## 2025-02-23 - Memoization Defeated by Inline Array Operations
**Learning:** When optimizing list components with React.memo, passing inline array derivations (like .slice() or .map()) as props creates a new array reference on every render. This completely defeats the memoization, as React performs a shallow equality check and sees the new reference as a changed prop.
**Action:** Always memoize derived arrays (using useMemo) before passing them down as props to React.memo wrapped components.

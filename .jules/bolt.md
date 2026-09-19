## 2026-09-19 - Expensive O(N*M) calculation in GroupDetail render loop
**Learning:** The GroupDetail component was executing an O(N*M) filtering and reduction of all transactions for every group member on every single render to calculate the top spender. This is a common performance anti-pattern in React when dealing with arrays.
**Action:** Always wrap expensive, repetitive array filtering/reducing computations inside `useMemo` to ensure they only recalculate when their specific dependencies (like the transactions list) change, rather than on every React re-render cycle.

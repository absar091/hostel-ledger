## 2024-05-18 - Unused O(N) Iterations in useMemo
**Learning:** A useMemo block grouping transactions into arrays (`todayTransactions`, `yesterdayTransactions`, `olderTransactions`) was completely unused by the component but ran an O(N) iteration on all transactions for every change. Unused variables derived from large datasets can be silent performance killers.
**Action:** Always check if derived state from expensive operations is actually consumed in the render or passed to child components.

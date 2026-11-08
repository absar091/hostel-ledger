## 2026-11-08 - Optimized GroupDetail stats calculation
**Learning:** Multiple array filters and map/reduce chains in React components executing on every render (or dependent on frequently changing arrays) can cause significant JS execution time overhead. This codebase has instances where arrays are iterated 4+ times to calculate derived stats.
**Action:** Replaced multiple `.filter().reduce()` chains with a single loop over `transactions` to compute all required stats (`totalSpent`, `expenseCount`, member contribution totals) simultaneously.

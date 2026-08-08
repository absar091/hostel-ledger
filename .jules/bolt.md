## 2023-11-20 - Group Detail Memory Leak and Performance Hit
**Learning:** In complex views like GroupDetail, recalculating member contributions and the top spender via .map() and .reduce() over a list of thousands of transactions triggers extremely expensive array iterations and heavy garbage collection during every single React render.
**Action:** Always wrap derived datasets that iterate over O(N) lists—especially combinations of group.members and transactions—with `useMemo` hooks, keeping dependencies accurate and ensuring they execute before any conditional early returns.

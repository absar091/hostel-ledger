## 2026-07-03 - Optimize Group Settlements Pre-calculation
**Learning:** Moving aggregation logic directly into useMemo prevents O(N * M) repeated computations across renders and effects.
**Action:** Pre-calculate aggregate data alongside raw objects in useMemo when both are needed frequently.

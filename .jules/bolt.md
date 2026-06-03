
## 2024-06-03 - Replaced O(N²) Array Lookups with O(1) Hash Map
**Learning:** Inside rendering loops, methods like `.find()` on arrays with each iteration create an O(N²) or O(T*M) bottleneck, degrading UI performance during rapid re-renders or with large datasets.
**Action:** Pre-compute a lookup hash map (e.g., using `Object.fromEntries` and `useMemo`) before iterating, changing array searches from O(M) to O(1) for significant rendering improvements.

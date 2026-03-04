
## 2024-05-24 - Replace O(N^2) Array.find() inside Array.map() with O(1) Map Lookups
**Learning:** Found a common performance anti-pattern in React codebase components like `GroupDetail` where relational lookup operations (`Array.prototype.find()`) were executed inside an `Array.map()` loop over large datasets (like transactions), leading to an O(N*M) bottleneck. This can severely degrade rendering performance for long lists.
**Action:** Next time, always pre-compute an O(1) hash map (e.g., using `Object.fromEntries()` inside a `useMemo`) before the map loop and replace the `.find()` calls with direct map lookups to reduce time complexity to O(N).

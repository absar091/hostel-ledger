## 2024-05-14 - Replace O(N*M) nested loop with O(1) hash map lookup
**Learning:** Using `Array.prototype.find()` inside `.map()` loops for relational data lookups (like finding group members for each transaction participant) causes an O(N*M) performance bottleneck.
**Action:** Pre-compute an O(1) hash map using `useMemo` (e.g., `memberMap`) before iterating over the array, and use direct lookups (`memberMap[id]`) inside the `.map()` loop.

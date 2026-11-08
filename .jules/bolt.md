## 2024-05-24 - [Avoid Array.prototype.find inside .map() loops]
**Learning:** Using `Array.prototype.find()` inside `.map()` loops for relational data lookups causes an O(N*M) performance bottleneck, as seen in `Activity.tsx` and `GroupDetail.tsx` when resolving members for transactions.
**Action:** Always pre-compute an O(1) hash map using `useMemo` for relational lookups instead of calling `.find()` in a loop.

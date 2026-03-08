## 2024-03-20 - O(1) Hash Map Optimization in GroupDetail
**Learning:** A common performance anti-pattern in the React codebase is using `Array.prototype.find()` inside `.map()` loops for relational data lookups (e.g., resolving members in `GroupDetail.tsx`). This causes an O(N*M) bottleneck which degrades performance as the number of transactions and members grows.
**Action:** When performing relational lookups inside loops, always pre-compute an O(1) hash map using `useMemo` (e.g., `memberMap[id]`) instead of O(N) array scans to significantly reduce CPU overhead during renders.

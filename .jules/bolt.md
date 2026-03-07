## 2024-05-24 - [Avoid `Array.prototype.find()` inside `.map()` loops for relational data lookups]
**Learning:** A common performance anti-pattern in the React codebase is using `Array.prototype.find()` inside `.map()` loops for relational data lookups (e.g., finding a group for a transaction in `Activity.tsx` or resolving members in `GroupDetail.tsx`). This causes an O(N*M) bottleneck.
**Action:** Optimize by pre-computing an O(1) hash map using `useMemo` (e.g., `Object.fromEntries(group.members.map(m => [m.id, m]))`).

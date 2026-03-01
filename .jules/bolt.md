## 2024-05-XX - React rendering anti-pattern in Activity.tsx
**Learning:** A common performance anti-pattern in the React codebase is using `Array.prototype.find()` inside `.map()` loops for relational data lookups (e.g., finding a group for a transaction in `Activity.tsx`). This causes an O(N*M) bottleneck.
**Action:** Optimize by pre-computing an O(1) hash map using `useMemo`.

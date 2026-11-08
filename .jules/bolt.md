## 2024-03-06 - Replacing O(N*M) with O(N+M)
**Learning:** Found a common React performance anti-pattern in the codebase: using `Array.prototype.find()` inside `.map()` loops for relational data lookups (e.g., finding a member name by ID inside a loop of transactions). This causes an O(N*M) bottleneck.
**Action:** Always pre-compute an O(1) hash map (e.g., `memberMap`) using `useMemo` before entering expensive render loops.

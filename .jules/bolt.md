## 2024-05-24 - React Anti-Pattern: Relational lookups inside maps
**Learning:** Found a major performance anti-pattern in React rendering where an O(N*M) bottleneck occurs by executing `.find()` inside of a `.map()` block across relational data arrays (like traversing users for transactions).
**Action:** Replaced `.find()` inside the map traversal with an O(1) hash map `useMemo` instance to pre-calculate mappings before rendering.

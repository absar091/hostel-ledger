## 2024-06-09 - Memoize expensive lookups in map loops
**Learning:** Found an $O(N \times M)$ overhead during React list rendering due to inner array `find()` calls inside the rendering `.map()`.
**Action:** Always pre-calculate a lookup `Map` (using `useMemo` in React) before mapping over large lists to reduce the inner lookup time to $O(1)$.

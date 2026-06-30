## 2024-06-30 - Optimize O(N log N) Lookups inside Sort
**Learning:** Performing dictionary or object property lookups inside an array `.sort()` comparator function is an anti-pattern. Because sort algorithms evaluate elements O(N log N) times, expensive lookups or computations are unnecessarily repeated.
**Action:** Pre-calculate or map the lookup values alongside the original items in an O(N) `.map()` or `.reduce()` first, sort based on the static values, and then extract the original items.

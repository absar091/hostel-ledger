## 2026-08-26 - O(N*M) nested loops in mapping degradation
**Learning:** Nested loops `O(N*M)` in React renders severely degrade performance. Memoizing lookup maps to `O(1)` access inside `transactions.map` and replacing `.filter().reduce()` inside `.map()` with an `O(N+M)` accumulator prevents CPU bottlenecks during frequent re-renders.
**Action:** Pre-compute maps using `.reduce()` before mapping to guarantee linear time complexity.

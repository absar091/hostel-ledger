
## 2024-05-18 - Optimize array-to-object conversions
**Learning:** Chaining `.map()` and `Object.fromEntries()` to create lookup maps creates intermediate array allocations.
**Action:** Use a single-pass `.reduce()` to populate the lookup map instead, which is more memory efficient and avoids unnecessary GC pressure. Always include strict typing (like `Record<string, Group>`) when using `reduce` to avoid ESLint `any` warnings.

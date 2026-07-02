
## $(date +%Y-%m-%d) - Array Chaining Anti-pattern in useMemo
**Learning:** Chaining array methods (`filter`, `reduce`, `flatMap`, `map`) inside React `useMemo` hooks creates hidden performance bottlenecks due to intermediate array allocations. This is especially problematic in data-heavy components like `Activity.tsx` and `Dashboard.tsx` where transactions are re-processed frequently.
**Action:** Replace sequential `.filter()` and `.reduce()` chains with single-pass `for` loops in performance-critical data processing hooks. Similarly, replace `Object.values().flatMap().filter()` chains with nested `for...in` loops to avoid unnecessary object-to-array conversions.


## 2026-07-18 - Optimize List Rendering and Array Transformations
**Learning:** Inline array derivations passed as props (e.g., `.slice(0, 5)`) completely defeat component memoization (`React.memo`) because they create a new reference on every render.
**Action:** Always extract derived inline arrays/objects into a `useMemo` hook before passing them to memoized components. Additionally, prefer a single-pass `.reduce()` over chaining `.map()` and `Object.fromEntries()` to avoid unnecessary intermediate array allocations.

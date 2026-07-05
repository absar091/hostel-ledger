## 2024-10-25 - Prevented Re-renders from inline array derivations
**Learning:** Passing inline array derivations (e.g. `array.slice(0, 5)`) as props to components expected to be optimized with `React.memo()` completely defeats the optimization because `slice` creates a new array reference on every render.
**Action:** Always wrap array derivations in `useMemo` (e.g., `const recent = useMemo(() => array.slice(), [array])`) before passing them as props to components.

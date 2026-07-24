## 2024-07-24 - Optimizing multiple iterations
**Learning:** Found multiple iterations of the same array in `src/pages/Dashboard.tsx` (`entries.filter` called twice for `toPayCount` and `toReceiveCount`). Using `.reduce()` condenses this into a single O(n) pass, preventing unnecessary processing in frequently run components.
**Action:** When calculating multiple derived properties from an array, use `reduce` to aggregate them in a single pass instead of multiple `filter` or `map` calls.

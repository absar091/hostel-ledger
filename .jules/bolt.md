## 2024-05-24 - Unused Heavy Computation in Render Cycle
**Learning:** React components sometimes retain complex data transformations (like O(N) array grouping by date) from older iterations that are no longer referenced in the UI.
**Action:** When auditing performance, look for destructuring assignments from `useMemo` where the destructured variables are never read elsewhere in the file.


## 2024-05-20 - Useless useMemo from Derived Objects
**Learning:** When memoizing derived hash maps (like `membersMap` in `GroupDetail.tsx`) that depend on an array mapping created within another `useMemo` or directly on render, you must ensure the parent object's reference is also memoized. Using `useMemo` on `membersMap` with `group.members` as a dependency was useless because `group.members` was an array recreated on every single render.
**Action:** Always verify that dependency arrays passed to `useMemo` maintain referential equality across renders, by memoizing the parent object or array creation first. Also, do not sacrifice code readability (like replacing `.find()` with 9-line `for` loops) for micro-optimizations that provide negligible benefits.

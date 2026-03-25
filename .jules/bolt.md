## 2024-05-18 - [Memoize Derived List Operations]
**Learning:** React components containing loops over data with internal complex object mappings (like Object.entries().reduce()) trigger heavy recalculations on every render and on every useEffect triggering, slowing down components like Groups list which has many items.
**Action:** Extract list-level derived data calculations (e.g. member settlements by group) into top-level useMemo() hooks so they are computed once per data change, passing only O(1) lookups to the render cycle and subsequent useEffects.

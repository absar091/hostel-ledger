## 2024-12-07 - [Optimize nested loops in React Renders]
**Learning:** Found a common anti-pattern where a nested O(N*M) calculation (mapping over members and filtering/reducing over transactions) was executed synchronously on every render.
**Action:** Always extract O(N*M) derived states into O(N+M) loops leveraging a hash map and wrap them in useMemo.

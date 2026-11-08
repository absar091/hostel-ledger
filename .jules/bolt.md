## 2024-05-14 - Replace O(N) array finds with O(1) Map lookups in Activity
**Learning:** `Activity.tsx` iterates over all transactions and uses `.find()` on `group.members` or similar arrays in nested loops to resolve names. Since `Activity.tsx` does not do deep member lookups but does do group lookups, the group lookup is a prime target for optimization.
**Action:** Replace `groups.find` with `groupMap[groupId]` using `useMemo` to create a hash map for group lookups.

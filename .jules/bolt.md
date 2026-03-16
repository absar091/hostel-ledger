## 2025-02-27 - O(1) Fast-Path Lookups for Object-Based Members
**Learning:** In Firebase Realtime Database structures, when members are stored as an object instead of an array, iterating over all keys with `Object.keys().find()` is an O(N) operation. However, the object key often directly corresponds to the `userId` or `id`.
**Action:** When performing member lookups by `userId` or `id`, prioritize checking `members[userId]` or `members[id]` first for an O(1) fast-path before falling back to O(N) iteration.

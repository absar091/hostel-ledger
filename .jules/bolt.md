## 2024-05-18 - Parallelizing Firebase Database Reads
**Learning:** In Firebase Realtime Database, when iterating over an array of IDs to fetch multiple independent documents (e.g., fetching group names for a user's groups), executing the reads sequentially using a `for...of` loop with `await` is an N+1 performance bottleneck.
**Action:** Always parallelize independent Firebase Realtime Database reads using `Promise.all()` (e.g., `await Promise.all(groupIds.map(...))`) to significantly reduce latency.

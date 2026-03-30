
## 2024-05-18 - Firebase Realtime Database N+1 Queries
**Learning:** Sequential `for...of` loops querying Firebase Realtime Database paths (like `groups/${groupId}`) create massive N+1 bottlenecks.
**Action:** Always parallelize independent iteration queries using `Promise.all()` mapped over the array. This executes all snapshot promises concurrently without blocking the Node event loop.

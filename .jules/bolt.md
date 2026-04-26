## 2025-01-25 - IndexedDB Write Optimization
**Learning:** Sequential await loops (`for...of`) when performing IndexedDB store puts create an N+1 latency bottleneck during cache updates.
**Action:** Use `Promise.all` to perform writes concurrently when saving collections of items (like groups or transactions) to IndexedDB stores.

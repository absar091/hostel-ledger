## 2024-04-10 - Sequential vs Concurrent Firebase DB Queries
**Learning:** Sequential Firebase DB queries inside loops (like `for...of` with `await`) cause an N+1 query bottleneck.
**Action:** Replace sequential loops containing database fetches with `Promise.all()` mapped over an array of promises for concurrent fetching, resulting in significant latency reduction (e.g. ~95% for 20 requests).

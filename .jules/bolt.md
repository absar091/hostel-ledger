## 2025-01-30 - Replace Sequential Firebase Queries with Promise.all
**Learning:** Sequential Firebase realtime database queries inside loops (N+1 query problem) cause significant latency bottlenecks, especially when fetching user group names.
**Action:** Always replace sequential database queries within iterations with `Promise.all` to enable concurrent fetching.

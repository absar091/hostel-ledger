## 2025-05-24 - Firebase N+1 Query Resolution
**Learning:** Sequential await loops on Firebase Realtime Database reads (like fetching members of a group individually) create severe N+1 latency bottlenecks, even when nodes are small.
**Action:** Always replace sequential await loops fetching discrete node references with `Promise.all()` to execute network requests concurrently, improving latency significantly.

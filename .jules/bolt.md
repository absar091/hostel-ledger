## 2024-03-23 - Parallelizing Database Reads
**Learning:** Independent Realtime Database `get()` calls executed sequentially in loops cause massive latency (N+1 problem).
**Action:** Always use `Promise.all()` to parallelize independent reads across multiple keys.

## 2025-05-20 - Parallelize Independent DB Reads
**Learning:** Parallelizing independent database reads (e.g., Firebase Realtime Database \`get()\` calls) using \`Promise.all()\` in the backend server significantly reduces latency compared to sequential execution in nested loops.
**Action:** Apply \`Promise.all()\` mapping strategies when reading decoupled sets of data, avoiding N+1 serial bottlenecks in endpoints.

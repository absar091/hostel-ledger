## 2024-04-18 - Concurrent Firebase Queries
**Learning:** Replacing sequential Firebase database queries in loops with `Promise.all()` for concurrent fetching avoids N+1 query latency problems and provides a significant measurable performance boost.
**Action:** Always prefer `Promise.all()` over sequential await inside loops when fetching multiple independent records from Firebase.

## 2024-04-17 - Concurrent Firebase Database Reads via Promise.all
**Learning:** Replacing sequential Firebase database queries in loops with Promise.all() for concurrent fetching avoids N+1 query latency problems and provides a significant measurable performance boost (e.g., ~95% latency reduction observed for 20 concurrent group fetches compared to sequential).
**Action:** Always prefer Promise.all() or Promise.allSettled() when doing multiple independent asynchronous fetches or writes to the database, particularly inside of loops where wait times compound.

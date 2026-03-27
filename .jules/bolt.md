## 2026-01-22 - Replacing sequential Firebase DB calls with Promise.all
**Learning:** Sequential Firebase DB calls inside `for...of` loops cause N+1 query bottlenecks in Express endpoints and cron jobs, noticeably increasing latency per item.
**Action:** Parallelize iterative Firebase fetches (e.g., iterating through multiple `groupIds`) using `Promise.all()` map-based arrays to concurrently process all snapshot promises without blocking the single thread.

## 2024-04-23 - Optimize Group Names Fetching with Promise.all
**Learning:** Fetching database records sequentially in a loop (e.g., `for (const gid of groupIds) await admin.database().ref(...).get()`) causes severe N+1 query latency, particularly over network boundaries.
**Action:** When replacing sequential Firebase loops, safely map iterable elements to their snapshot results using an index-based loop (`for (let i = 0; i < groupIds.length; i++)`) combined with `Promise.all()` to achieve concurrent fetching without scope detachment issues.


## 2024-05-24 - [N+1 Query Resolution with Promise.all]
**Learning:** Sequential `for...of` loops making Firebase queries (`once('value')` or `get()`) create severe N+1 latency bottlenecks, blocking the thread and increasing response times linearly with the number of groups/items.
**Action:** Always map over the array to create an array of promises and await them concurrently using `Promise.all()` to significantly reduce latency.

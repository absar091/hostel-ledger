## 2024-03-30 - Parallelize Independent Awaits
**Learning:** N+1 query bottlenecks can occur when using `await` inside `for...of` loops, as each loop waits for the previous database call to complete sequentially. Concurrent queries can drastically reduce response time for multiple independent lookups.
**Action:** Always evaluate if sequential database queries in loops are independent. If they are, parallelize them using `Promise.all()` to achieve concurrent execution and avoid N+1 delays.

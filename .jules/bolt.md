
## 2025-02-12 - Parallelizing Firebase Database Lookups
**Learning:** Sequential `for...of` loops over independent database references (e.g., `admin.database().ref(...).get()`) cause significant N+1 latency bottlenecks. Parallelizing them with `Promise.all` can reduce response times by 10-20x for large datasets.
**Action:** Always scan for sequential network requests in loops and replace them with `Promise.all` when the requests do not depend on each other.

## 2024-05-18 - Replacing sequential Firebase DB queries with Promise.all()
**Learning:** Sequential Firebase database queries in `for...of` loops cause massive N+1 query latency problems when resolving relations (e.g. fetching names for multiple group IDs).
**Action:** Always replace sequential `await admin.database().ref().get()` inside loops with concurrent `Promise.all()` fetching. This results in significant (e.g. ~90%) latency reduction, avoiding performance bottlenecks on backend endpoints like AI context generation.

## 2024-03-27 - Parallelize Database Reads in Loops
**Learning:** Sequential Firebase `admin.database().ref().get()` calls inside a `for...of` loop cause an N+1 performance bottleneck. Even though JS is single-threaded, the promises for these async I/O database calls can be fired off concurrently.
**Action:** Use `Promise.all(items.map(async (item) => ...))` to resolve independent snapshot fetches in parallel, instead of sequentially awaiting them inside the loop. Concurrently assigning to a shared dictionary inside the resolved promises is safe due to the single-threaded event loop.

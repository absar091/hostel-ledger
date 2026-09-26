## 2024-06-25 - Caching Intl.NumberFormat
**Learning:** `Number.prototype.toLocaleString()` is extremely expensive because it instantiates a new formatter internally on every call. Using it in React render loops (e.g., mapping over 100 transactions) significantly blocks the main thread.
**Action:** Always cache and reuse `Intl.NumberFormat` instances in a `Map` keyed by locale/options when formatting currencies or dates frequently.


## 2024-05-24 - Intl.NumberFormat Caching
**Learning:** Calling `Number.prototype.toLocaleString()` inside frequently called functions (like currency formatting in loops or React renders) is a significant performance bottleneck because it instantiates a new `Intl.NumberFormat` object on every call.
**Action:** Always cache and reuse `Intl.NumberFormat` instances using a `Map` when formatting numbers or currencies in utility functions.

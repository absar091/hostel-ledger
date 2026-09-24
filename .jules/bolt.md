## 2024-05-24 - Number.prototype.toLocaleString() Performance Penalty
**Learning:** Calling `Number.prototype.toLocaleString()` inside render loops or frequently called formatting functions is computationally expensive because it instantiates a new `Intl.NumberFormat` instance on every call.
**Action:** Always cache and reuse `Intl.NumberFormat` instances using a Map or memoized function for high-frequency formatting operations, especially for currencies or numbers in UI lists/charts.

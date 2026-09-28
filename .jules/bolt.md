## 2024-06-25 - Optimizing Number Formatting
**Learning:** `Number.prototype.toLocaleString()` instantiates a new formatter on every call, which is computationally expensive (especially during list rendering). Benchmarks show it can take over 50x longer than using a cached formatter.
**Action:** Always cache and reuse `Intl.NumberFormat` instances instead of calling `toLocaleString()` when formatting numbers or currencies in loops or render cycles.

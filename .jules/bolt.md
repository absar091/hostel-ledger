## 2024-10-24 - Number Formatting Overhead
**Learning:** `Number.prototype.toLocaleString()` implicitly recreates `Intl.NumberFormat` instances internally on every call, creating a significant hidden bottleneck when rendering large lists of transactions or datasets.
**Action:** Always cache and reuse `Intl.NumberFormat` instances (e.g., using a `Map` keyed by currency/locale) when formatting numbers in utility functions to achieve an order-of-magnitude speedup.

## 2024-10-30 - Caching Intl.NumberFormat
**Learning:** In V8 and browsers, `Number.prototype.toLocaleString()` is extremely slow because it internally instantiates a new locale formatter every time it is called. In a financial application like this one where `formatCurrency` is called heavily within React loops/lists (e.g., transaction histories or member balances), this causes significant rendering latency.
**Action:** Always cache and reuse `Intl.NumberFormat` instances using a `Map` keyed by locale and formatting options (like decimals) instead of relying on `toLocaleString()`.

## 2024-10-05 - Intl.NumberFormat Caching
**Learning:** `toLocaleString()` inside a frequently called function creates a new `Intl.NumberFormat` instance each time, which is slow (~20x slower than caching the formatter).
**Action:** When repeatedly formatting numbers or currency, instantiate `Intl.NumberFormat` once per locale/options and cache it, then use `.format(value)`.

## 2026-09-23 - Intl.NumberFormat Caching
**Learning:** Number.prototype.toLocaleString() is computationally expensive in hot paths because it creates a new formatter every time.
**Action:** Always cache and reuse Intl.NumberFormat instances for currency or number formatting, especially in loops or React renders.

## 2024-05-19 - Use Cached Intl.NumberFormat for Currency Formatting
**Learning:** Calling `Number.prototype.toLocaleString()` inside React render cycles or loops is computationally expensive because it creates a new `Intl.NumberFormat` instance on every call.
**Action:** Always cache and reuse `Intl.NumberFormat` instances instead of relying on `toLocaleString()` directly, especially for currency/number formatting functions that are called frequently.

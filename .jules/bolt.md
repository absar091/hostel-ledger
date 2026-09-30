## 2024-05-18 - Caching Intl.NumberFormat for Currency Formatting
**Learning:** Instantiating `Intl.NumberFormat` or calling `Number.prototype.toLocaleString()` on every format call is computationally expensive. In a React app where currency is formatted frequently (e.g., in lists of transactions), this creates significant overhead.
**Action:** When implementing currency formatting, cache the `Intl.NumberFormat` instances based on locale and decimal requirements instead of creating new instances repeatedly, significantly reducing execution time.

## 2024-02-23 - Intl.NumberFormat Instantiation Bottleneck
**Learning:** In frontend performance, repeatedly instantiating `Intl.NumberFormat` instances within `.toLocaleString()` during large list renders (or loops) severely blocks the main thread. It is noticeably slow when formatting thousands of prices on a dashboard or ledger view.
**Action:** When multi-currency formatting or heavy number formatting is required, cache the `Intl.NumberFormat` instances in a `Map` (keyed by locale/decimals) and reuse `.format()` instead of repeatedly calling `.toLocaleString()`.

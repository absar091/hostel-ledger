## 2025-05-14 - Cache Intl.DateTimeFormat
**Learning:** Calling `toLocaleTimeString` or instantiating `Intl.DateTimeFormat` inside render loops creates unnecessary object allocations and slows down list rendering significantly, especially for components like `TransactionItem` that render many times.
**Action:** Always extract `Intl.DateTimeFormat` instances to module-level constants to reuse a single formatter across all component instances.

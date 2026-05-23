## 2025-03-01 - Cache Intl.DateTimeFormat for faster list rendering
**Learning:** `new Date(...).toLocaleTimeString` inside list items (`TransactionItem`, `GroupChat`) is a performance bottleneck. Using `Intl.DateTimeFormat` without caching it offers little improvement, but a cached `Intl.DateTimeFormat` module singleton significantly speeds up date formatting.
**Action:** When formatting dates repeatedly inside lists or frequently rendered components, instantiate a cached `Intl.DateTimeFormat` outside the component scope and use its `.format()` method.

## 2026-05-07 - [Pre-instantiate Intl.DateTimeFormat in loops]
**Learning:** Calling `.toLocaleTimeString()` within a component's render body instantiates `Intl.DateTimeFormat` repeatedly under the hood. When rendering hundreds of items in a list (like `TransactionList`), this causes a massive bottleneck.
**Action:** Pre-instantiate `Intl.DateTimeFormat` as a module-level constant and use `.format()` inside the render logic to dramatically improve rendering performance.

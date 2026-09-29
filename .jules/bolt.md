## 2025-05-18 - Optimized Currency Formatting
**Learning:** In React applications with numerous financial components, using `toLocaleString()` directly inside render cycles or loops for formatting currency causes significant performance overhead because it instantiates a new `Intl.NumberFormat` on every call.
**Action:** When adding or updating currency/number formatting, cache and reuse `Intl.NumberFormat` instances using a Map with the locale and decimal configuration as the key, then use `.format(amount)`.

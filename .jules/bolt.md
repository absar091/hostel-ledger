## 2024-05-21 - Caching Intl.NumberFormat
**Learning:** Re-instantiating `Intl.NumberFormat` on every `toLocaleString` call inside a React render loop or `.map()` function is a major performance bottleneck, as formatting numbers can be computationally expensive.
**Action:** When optimizing JavaScript performance for number/currency formatting, always cache and reuse `Intl.NumberFormat` instances instead of repeatedly calling `Number.prototype.toLocaleString()`.

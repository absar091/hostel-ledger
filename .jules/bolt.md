## 2025-02-28 - Intl.NumberFormat Caching
**Learning:** Native `toLocaleString` on numbers dynamically instantiates an `Intl.NumberFormat` object under the hood on every single invocation. When formatting multiple currency values in heavily rendered components or loops, this produces a measurable latency bottleneck.
**Action:** When working in performance-sensitive contexts, cache the `Intl.NumberFormat` instance using a `Map` keyed by deterministic arguments (e.g. locale and decimals) and invoke its `.format()` method to reuse the object.

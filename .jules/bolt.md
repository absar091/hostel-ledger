## 2024-06-25 - Cache Intl.NumberFormat in React Render Loops
**Learning:** Calling `Number.prototype.toLocaleString()` or recreating `Intl.NumberFormat` on every call is computationally expensive. When used in formatting functions (like `formatCurrency`) that are called frequently during React list renders or deep component trees, this can create a significant main-thread bottleneck.
**Action:** Always instantiate `Intl.NumberFormat` objects once and cache them (e.g., using a module-level `Map` keyed by locale and options) for reuse in frequently called synchronous formatting utilities.

## 2024-03-24 - Cached Intl.NumberFormat optimization
**Learning:** Native `Number.toLocaleString()` in JavaScript is a known performance bottleneck when rendering large lists of transactions or budget items, as it instantiates a new formatter object every time it is called.
**Action:** Always use a cached `Intl.NumberFormat` instance (like the `formatNumber` utility in `src/lib/utils.ts`) instead of `.toLocaleString()` for numbers to avoid redundant instantiations and significantly improve rendering performance.

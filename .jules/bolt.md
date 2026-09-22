## 2023-10-27 - Caching Intl.NumberFormat
**Learning:** To optimize JavaScript performance when formatting numbers or currencies (especially within loops or React render cycles), cache and reuse `Intl.NumberFormat` instances instead of calling `Number.prototype.toLocaleString()`, which is computationally expensive because it instantiates a new formatter on every call.
**Action:** Create a map of cached `Intl.NumberFormat` instances keyed by locale and options.

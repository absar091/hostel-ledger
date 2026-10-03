## 2024-10-03 - Optimize toLocaleString calls
**Learning:** `toLocaleString()` can be a major performance bottleneck in React when rendering lists or components with multiple formatted numbers. Caching `Intl.NumberFormat` objects significantly improves rendering performance.
**Action:** Replace direct calls to `toLocaleString()` inside loops or frequent renders with a cached formatter, such as `Intl.NumberFormat`.

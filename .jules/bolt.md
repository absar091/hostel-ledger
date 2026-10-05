## 2023-10-05 - Intl.NumberFormat optimization
**Learning:** Number formatting using `toLocaleString()` in a loop is extremely slow because it instantiates a new `Intl.NumberFormat` object every time.
**Action:** When repeatedly formatting numbers (e.g. in maps/renders), use a cached `Intl.NumberFormat` instance which is significantly faster (4600ms vs 195ms for 100k iterations).

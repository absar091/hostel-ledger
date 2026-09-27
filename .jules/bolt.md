## 2024-05-27 - Caching Intl.NumberFormat
**Learning:** Calling `toLocaleString()` frequently in loops and React render cycles is a major performance bottleneck because it instantiates a new formatter object every time.
**Action:** Cache and reuse `Intl.NumberFormat` instances instead of calling `toLocaleString`.

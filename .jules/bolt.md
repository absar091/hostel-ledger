## 2024-05-04 - [Intl.DateTimeFormat Optimization]
**Learning:** Instantiating `Intl.DateTimeFormat` (or using `toLocaleTimeString` which instantiates it under the hood) inside React render functions or loops is a performance bottleneck.
**Action:** Pre-instantiate `Intl.DateTimeFormat` as a module-level singleton constant instead for a significant speedup.

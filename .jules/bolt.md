## 2024-05-03 - [Optimize DateTimeFormat]
**Learning:** Instantiating `Intl.DateTimeFormat` (or using `toLocaleTimeString` which does it under the hood) inside a React render function, especially in lists, is a major performance bottleneck due to costly initializations.
**Action:** Pre-instantiate `Intl.DateTimeFormat` as a module-level singleton constant instead to significantly speed up rendering.

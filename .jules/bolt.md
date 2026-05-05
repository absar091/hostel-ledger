## 2025-05-05 - Intl.DateTimeFormat performance optimization
**Learning:** Instantiating `Intl.DateTimeFormat` (or calling `.toLocaleTimeString()` which does so under the hood) inside a React component render function or a loop over elements (like transactions in a list) is a significant performance bottleneck due to its expensive setup cost.
**Action:** Always pre-instantiate `Intl.DateTimeFormat` objects as module-level constants outside of the component render cycle when formatting dates/times in lists or frequently rendered components.

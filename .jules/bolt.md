
## 2024-05-24 - Pre-instantiating Intl.DateTimeFormat
**Learning:** Calling `toLocaleTimeString` inside render functions or loops implicitly instantiates `Intl.DateTimeFormat` each time, which is an expensive operation and can cause performance bottlenecks in list rendering.
**Action:** Always pre-instantiate `Intl.DateTimeFormat` as a module-level constant when formatting dates/times within React components or loops.

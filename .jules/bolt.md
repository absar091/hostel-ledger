
## 2024-05-26 - Cache Intl.DateTimeFormat in List Renders
**Learning:** Using `new Date().toLocaleTimeString()` inside list items is a massive performance bottleneck because it recreates the locale object on every render.
**Action:** Extract a single `Intl.DateTimeFormat` instance outside the component and use its `.format()` method, ensuring to validate the Date object first since it strictly throws on invalid dates.

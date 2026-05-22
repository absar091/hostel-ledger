
## 2024-05-22 - Native Date Parsing Bottleneck
**Learning:** `new Date().toLocaleDateString()` is surprisingly slow in tight loops or large array processing (e.g. mapping over 100 recent transactions) because it creates a new `Intl` instance under the hood on every single invocation.
**Action:** Replace native `toLocaleDateString` calls with a shared, cached `Intl.DateTimeFormat` instance when formatting multiple dates. Remember to check for invalid dates (`!Number.isNaN(dt.getTime())`) since `format()` throws on invalid instances.

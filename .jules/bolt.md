## 2024-05-19 - Repeated toLowerCase() inside render/filter loops
**Learning:** Calling `searchQuery.toLowerCase()` repeatedly inside array `.filter()` loops across thousands of items recalculates the exact same string value on every single iteration, leading to unnecessary CPU overhead.
**Action:** Extract `searchQuery.toLowerCase()` into a `const query = searchQuery.toLowerCase();` variable before the `.filter()` loop.

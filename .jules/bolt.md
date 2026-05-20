## 2024-05-18 - [Optimizing Date Formatting in Render Loops]
**Learning:** Instantiating `Intl.DateTimeFormat` via string methods like `toLocaleTimeString` on every render inside heavily mapped components (like Chat bubbles or Transaction items) causes significant performance overhead in large lists.
**Action:** Use a module-level singleton for `Intl.DateTimeFormat` to format dates across list items, taking care to handle Invalid Dates gracefully since `.format()` throws on them unlike string fallbacks.

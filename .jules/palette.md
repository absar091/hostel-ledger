## 2024-05-23 - Replaced native tooltips with accessible Radix Tooltips
**Learning:** Native `title` attributes on buttons in the Sidebar are inaccessible to keyboard and screen reader users compared to custom tooltips that support focus, keyboard navigation, and consistent visual presentation.
**Action:** When creating icon-only buttons or interactive elements that need descriptions, use custom accessible tooltips (like Radix UI `<Tooltip>`) combined with `aria-label`s instead of relying on the native `title` attribute. Ensure the interactive element is correctly wrapped.

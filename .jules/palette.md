## 2025-04-04 - Prevent Double Tooltips on Radix UI Tooltip implementation
**Learning:** Native `title` attributes cause ugly, unstyled double-tooltips when implementing custom accessible tooltips (like Radix UI) over icon buttons.
**Action:** Always explicitly remove the native `title` attribute when wrapping existing elements in a custom accessible Tooltip component.

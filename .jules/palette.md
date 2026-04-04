## 2024-04-04 - Improve Icon-only Button Accessibility
**Learning:** When using Radix UI tooltips on elements that already possess a native `title` attribute, removing the native `title` is essential to prevent double-tooltips from appearing, ensuring a seamless user experience.
**Action:** Always explicitly remove the native `title` attribute from interactive elements when adding a custom accessible tooltip component to replace it.

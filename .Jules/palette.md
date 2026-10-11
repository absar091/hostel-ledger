## 2025-04-06 - Removing native tooltips when adding custom tooltips
**Learning:** When adding custom tooltips (like Radix UI's `<Tooltip>`) to elements that already have native browser tooltips (`title` attribute), both will render simultaneously, creating a confusing and inaccessible "double-tooltip" effect.
**Action:** Always explicitly remove the native `title` attribute when wrapping an element in a custom tooltip component.

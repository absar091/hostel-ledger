## 2025-04-04 - Tooltip Implementation Strategy
**Learning:** Native `title` attributes cause redundant double-tooltips when Radix UI `<Tooltip>` components are implemented over existing buttons.
**Action:** Always explicitly remove the native `title` attribute when wrapping interactive elements with a custom Tooltip, while ensuring the `aria-label` remains for screen-reader accessibility.

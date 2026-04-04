## 2025-04-04 - Radix UI Tooltip Migration
**Learning:** When adding tooltips to buttons, we should replace native `title` attributes with the design system's Radix UI `<Tooltip>` components. Leaving the native `title` alongside Radix `<Tooltip>` causes double-tooltips to appear to users.
**Action:** Always wrap target interactive elements with `<TooltipTrigger asChild>` and explicitly delete the native `title` attribute.

## 2024-05-04 - Replacing title with custom Tooltip and aria-label
**Learning:** Found a pattern where icon-only buttons rely on native `title` attributes for both visual tooltips and screen reader names. Simply replacing `title` with custom tooltips breaks accessibility.
**Action:** When migrating to custom `<Tooltip>`, always explicitly add `aria-label` to preserve the accessible name and use `<TooltipTrigger asChild>` for semantic buttons.

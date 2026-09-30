## 2024-05-24 - Tooltip and ARIA Labels for Icon Buttons
**Learning:** Native `title` attributes on icon-only buttons create an inconsistent UI experience and lack direct screen-reader accessibility for some configurations, especially in modals where tooltips are helpful for clarity (like 'Share as Image' or 'Copy Reference').
**Action:** Always replace native `title` attributes with Radix UI `<Tooltip>` components and explicitly include an `aria-label` containing the same descriptive text to ensure both visual consistency and robust accessibility.

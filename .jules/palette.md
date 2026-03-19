## 2025-03-19 - Standardizing Sidebar Toggle Accessibility
**Learning:** In this application's custom UI, toggle components like the main Sidebar toggle often miss standard keyboard focus states (`focus-visible:ring-ring`) and essential `aria-expanded` attributes, making them inaccessible to keyboard and screen reader users.
**Action:** When working with custom interactive toggle buttons in this codebase, ensure they explicitly include `aria-expanded` reflecting their state, and standard focus ring utility classes from the design system.

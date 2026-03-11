## 2024-05-18 - Navigation Active States Missing ARIA
**Learning:** The `BottomNav` and `Sidebar` components in this application relied solely on visual indicators (like background colors, active classes, and bold fonts) to denote the active navigation tab, lacking explicit `aria-current="page"` attributes to communicate the current page to screen readers.
**Action:** When creating or updating navigation components (e.g., tabs, sidebars, bottom navs), always ensure active links explicitly set `aria-current="page"` to convey their state non-visually.

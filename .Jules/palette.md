## 2025-02-28 - ARIA labels on icon-only buttons
**Learning:** Icon-only buttons without labels are not accessible. GroupChat component had multiple buttons missing ARIA labels which would result in poor screen reader experience.
**Action:** Always verify components that are only rendering icons (like X or Lucide React icons) and apply `aria-label` attributes to ensure they are properly identified.

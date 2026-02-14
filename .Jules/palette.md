## 2024-05-22 - Form Input Accessibility Pattern
**Learning:** The `Input` component is a raw wrapper without label integration, leading to detached labels in `Login.tsx` (and likely others). This requires manual `htmlFor`/`id` association which is easily missed.
**Action:** When working on forms in this codebase, explicitly check for and add `htmlFor` and `id` attributes, as the component system doesn't enforce or automate this.

## 2026-02-14 - Icon Button and Tab Accessibility
**Learning:** High-traffic pages like `GroupDetail` rely heavily on icon-only buttons (Back, Settings) which were completely invisible to screen readers. Also, custom tab implementations using `div`s and `button`s lacked semantic roles (`tablist`, `tab`, `tabpanel`), making navigation confusing for assistive tech.
**Action:** Always add `aria-label` to icon-only buttons immediately. For custom tabs, rigorously apply the WAI-ARIA Tabs pattern (`role="tablist"`, `aria-selected`, `aria-controls`) to ensure structure is communicated, not just visual state.

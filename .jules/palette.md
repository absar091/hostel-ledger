## 2024-05-14 - Redundant screen reader announcements for purely visual icons
**Learning:** Decorative icons inside buttons with `aria-label`s create a redundant or confusing experience for screen reader users if not explicitly hidden.
**Action:** When adding `aria-label` to buttons containing SVG icons, ensure the `<svg>` component is marked with `aria-hidden="true"`.

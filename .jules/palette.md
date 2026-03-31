## 2024-03-31 - Hide Decorative Icons from Screen Readers
**Learning:** When using `aria-label` or `.sr-only` text on icon-only buttons, the visual `<svg>` (or `Icon` component) should explicitly have `aria-hidden="true"`. Otherwise, screen readers may announce confusing, redundant information like "image" or the SVG's generic label along with the button's intended label.
**Action:** Always add `aria-hidden="true"` to any decorative icons nested within a button or link that already has an accessible name.

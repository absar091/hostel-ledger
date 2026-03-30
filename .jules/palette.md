## 2024-03-30 - Hide decorative icons in icon-only buttons
**Learning:** Adding `aria-label` to a button is good, but screen readers might still read the internal `<svg>` element unless explicitly told to ignore it. This causes redundant announcements or confuses users.
**Action:** When adding `aria-label` to buttons, always remember to add `aria-hidden="true"` to the inner decorative icons or elements.

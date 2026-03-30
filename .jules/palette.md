## 2024-05-18 - Prevent Redundant Icon Announcements
**Learning:** When adding `aria-label` to buttons (especially icon-only buttons), the internal `<svg>` icon should explicitly be marked with `aria-hidden="true"`. Without this, some screen readers might try to announce the decorative icon elements, causing confusion or redundant announcements on top of the button's `aria-label`.
**Action:** Always add `aria-hidden="true"` to Lucide React icons or custom SVGs inside buttons that have an `aria-label` or visible text content that serves as the accessible name.

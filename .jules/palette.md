## 2024-05-18 - Icon-Only Button Accessibility in Modals
**Learning:** Found multiple icon-only buttons (like "Share Image", "Close Modal", "Copy ID") across transaction components that relied solely on visual icons or `title` attributes without `aria-label`s.
**Action:** Always explicitly add `aria-label` to icon-only buttons, and append `aria-hidden="true"` to the internal `<svg>` or loading spinner to prevent redundant announcements by screen readers.

## 2025-05-15 - ARIA Labels on Icons within Labelled Buttons
**Learning:** When adding `aria-hidden="true"` to purely decorative SVG icons within `<button>` tags, it is important to verify that the parent `<button>` actually contains an explicit `aria-label` or accessible name, otherwise screen readers may announce an empty button. (In this case, `NotificationIcon.tsx` already had an `aria-label`, but the rule applies generally).
**Action:** Always verify parent `<button>` accessible names when hiding internal SVG elements with `aria-hidden`.

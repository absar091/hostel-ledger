## 2024-11-07 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons often rely on native `title` attributes which provide a poor visual UX and are sometimes inconsistently read by screen readers. Tooltip wrappers should be preferred along with explicit `aria-label`s on the button element itself.
**Action:** When adding or updating icon-only buttons, wrap them in Radix UI `Tooltip` components to provide visually pleasing, accessible context, and ensure an explicit `aria-label` is present on the `<button>` element.

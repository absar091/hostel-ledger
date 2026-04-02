
## 2024-04-02 - Accessible Discuss Buttons
**Learning:** Icon-only buttons or buttons with accompanying icons require specific ARIA properties. An icon-only button must have an `aria-label`, and its internal visual elements (like `MessageSquareText` or SVG icons) should be marked with `aria-hidden="true"` to prevent screen readers from reading them redundantly.
**Action:** When adding or updating buttons with icons, ensure appropriate `aria-label` is applied to the button element and `aria-hidden="true"` is applied to the icon element itself.

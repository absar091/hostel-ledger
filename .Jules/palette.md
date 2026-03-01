## 2024-05-22 - Form Input Accessibility Pattern
**Learning:** The `Input` component is a raw wrapper without label integration, leading to detached labels in `Login.tsx` (and likely others). This requires manual `htmlFor`/`id` association which is easily missed.
**Action:** When working on forms in this codebase, explicitly check for and add `htmlFor` and `id` attributes, as the component system doesn't enforce or automate this.

## 2026-02-24 - Accessibility Testing Precision
**Learning:** When using Playwright's `get_by_label()`, labels containing substrings of others (e.g., "Password" vs "Confirm Password") can cause strict mode violations.
**Action:** Use `get_by_label("Label Text", exact=True)` to disambiguate, or use more specific locators if necessary.

## 2024-05-24 - Accessible Input Association
**Learning:** Many inputs in complex sheets (like Add Expense) rely on placeholders or nearby text without explicit `htmlFor`/`id` association, making them hard for screen readers.
**Action:** When adding new form inputs, always use explicit `<label htmlFor="id">` and `<Input id="id">` association, even if the layout is custom.

## 2026-02-26 - Low Contrast Color Opacity Pattern
**Learning:** The design system frequently uses `text-[#4a6850]/60` and `text-[#4a6850]/80` for labels and secondary text. While the base color `#4a6850` passes WCAG AA against white (6.17:1), adding opacity (especially 60%) drops the contrast below 3:1, making it inaccessible.
**Action:** Avoid using opacity modifiers on the primary brand color for text content. Use the base color `text-[#4a6850]` directly to maintain readability and compliance.

## 2026-02-27 - Explicit Label Association in Custom Sheets
**Learning:** Custom sheet components like `AddMoneySheet` often separate `label` elements from `Input` components for styling purposes, necessitating manual `id` and `htmlFor` bindings to ensure accessibility.
**Action:** When creating or modifying form layouts in Sheets or Dialogs, verify that every visual label is programmatically associated with its input using `htmlFor` and `id`, or use `aria-label` for inputs with no visible label.

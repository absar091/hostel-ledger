## 2024-05-22 - Form Input Accessibility Pattern
**Learning:** The `Input` component is a raw wrapper without label integration, leading to detached labels in `Login.tsx` (and likely others). This requires manual `htmlFor`/`id` association which is easily missed.
**Action:** When working on forms in this codebase, explicitly check for and add `htmlFor` and `id` attributes, as the component system doesn't enforce or automate this.

## 2026-02-24 - Accessibility Testing Precision
**Learning:** When using Playwright's `get_by_label()`, labels containing substrings of others (e.g., "Password" vs "Confirm Password") can cause strict mode violations.
**Action:** Use `get_by_label("Label Text", exact=True)` to disambiguate, or use more specific locators if necessary.

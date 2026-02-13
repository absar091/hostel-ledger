## 2024-05-22 - Form Input Accessibility Pattern
**Learning:** The `Input` component is a raw wrapper without label integration, leading to detached labels in `Login.tsx` (and likely others). This requires manual `htmlFor`/`id` association which is easily missed.
**Action:** When working on forms in this codebase, explicitly check for and add `htmlFor` and `id` attributes, as the component system doesn't enforce or automate this.

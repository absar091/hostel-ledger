## 2024-05-22 - Form Input Accessibility Pattern
**Learning:** The `Input` component is a raw wrapper without label integration, leading to detached labels in `Login.tsx` (and likely others). This requires manual `htmlFor`/`id` association which is easily missed.
**Action:** When working on forms in this codebase, explicitly check for and add `htmlFor` and `id` attributes, as the component system doesn't enforce or automate this.

## 2024-05-23 - Custom Interactive Areas Accessibility
**Learning:** Custom interactive elements like file upload zones (e.g., in `CreateGroup.tsx`) are implemented as `div`s with `onClick` but lack keyboard support (`tabIndex`, `onKeyDown`, `role`), making them inaccessible to keyboard users.
**Action:** Always add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler (for Enter/Space) to any non-button element that is made interactive via `onClick`.

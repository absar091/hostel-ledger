## 2024-03-30 - Hide Decorative Icons from Screen Readers
**Learning:** When improving accessibility for icon-only buttons (e.g., adding `aria-label`), internal visual elements like `<svg>` icons must be explicitly marked with `aria-hidden="true"`. Otherwise, screen readers may announce redundant or confusing elements (like "Bell image" inside a "Notifications" button).
**Action:** Always add `aria-hidden="true"` to decorative icons inside interactive elements that already have an accessible name.

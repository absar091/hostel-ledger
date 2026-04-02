## 2025-04-02 - Add aria-hidden to decorative internal icons
**Learning:** When improving accessibility for icon-only buttons (e.g., adding `aria-label`), internal visual elements like `<svg>` icons or loading spinners are explicitly marked with `aria-hidden="true"` to prevent screen readers from announcing redundant or confusing elements.
**Action:** Always ensure decorative SVGs inside buttons with valid `aria-label` get `aria-hidden="true"`.


## $(date +%Y-%m-%d) - ARIA labels for Search and Close Buttons
**Learning:** Found multiple icon-only utility buttons like "Search" and "Close" missing ARIA labels and `aria-hidden` attributes on internal SVGs within complex sheets.
**Action:** When adding utility buttons inside input groups or modal headers, always ensure they have explicit `aria-label`s and `aria-hidden="true"` on their child SVGs to prevent screen readers from announcing ambiguous icons.

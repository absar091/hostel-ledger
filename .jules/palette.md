## 2024-04-03 - Missing ARIA Labels on Icon-only Buttons in Settings
**Learning:** Found multiple icon-only buttons (`<Button size="icon">`) inside `GroupSettingsSheet.tsx` (copy link, search member, close input) that were lacking `aria-label`s, making their functions opaque to screen readers.
**Action:** Always ensure any `<Button>` component lacking text content and relying purely on an icon explicitly receives a descriptive `aria-label` attribute for accessibility.

## 2024-11-20 - Adding aria-hidden to decorative SVG icons

**Learning:** When using screen readers, SVG icons inside buttons that already have an `aria-label` can still sometimes be read or create redundant noise if they aren't explicitly hidden from the accessibility tree.
**Action:** Always add `aria-hidden="true"` to internal `lucide-react` or similar SVG icons when they are used purely for visual decoration inside an interactive element that already has a proper `aria-label` or `.sr-only` text.

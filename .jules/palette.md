## 2024-05-18 - Improve Accessibility of Icon-Only Buttons
**Learning:** Icon-only buttons often lack adequate fallback labels. When replacing a native `title` attribute with a custom visual tooltip (e.g. Radix UI `<Tooltip>`), the button itself loses its accessible name if `aria-label` isn't added explicitly.
**Action:** When converting title attributes to tooltips, always add `aria-label="[label]"` directly to the `<button>` element to ensure it's fully accessible to screen readers, and consider grouping it with `focus-visible` states to improve keyboard navigation.

## 2024-03-01 - Add context-aware ARIA labels to TimelineItem buttons
**Learning:** Found that complex list items representing transactional data (like `TimelineItem.tsx` buttons) often lack screen-reader-friendly unified summaries. Instead of leaving screen readers to read a chaotic stream of nested spans and divs, providing a single, coherent sentence as an `aria-label` (e.g., "View details for expense: Dinner, $50 paid by John on Oct 12") on the main button wrapper significantly improves context and navigability.
**Action:** When implementing complex interactive items like cards or list items functioning as buttons, always synthesize their internal data points into a clear, single-string `aria-label` for screen reader accessibility, avoiding disjointed reading of nested text elements.

## 2024-05-24 - Provide Screen Reader Context for Active Navigation Items
**Learning:** Found that custom active state styling in navigation components (`Sidebar.tsx`, `BottomNav.tsx`) visually indicates the current page using colors or highlights, but screen readers are unable to convey this information. Adding `aria-current="page"` ensures screen readers explicitly announce the current active navigation item.
**Action:** Always include `aria-current="page"` conditionally on active links/buttons in navigation components, rather than relying solely on visual cues like classes and icons.

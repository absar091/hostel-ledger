## 2026-04-03 - Tooltips for Icon-Only Buttons
**Learning:** Icon-only buttons with `aria-label`s are good for screen readers, but sighted users (especially on desktop) may still struggle to understand their purpose without text labels. `shadcn/ui` tooltips are an effective way to bridge this gap without cluttering the UI.
**Action:** When working on interactive UI elements that lack text labels, always consider wrapping them in a Tooltip from `@/components/ui/tooltip` using `TooltipTrigger asChild` to provide visible context on hover or focus, ensuring you import the necessary components.

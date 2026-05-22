## 2024-05-14 - Empty State Guidance
**Learning:** Empty states without a clear call to action can leave users wondering what to do next.
**Action:** Always provide a clear, actionable button or link in empty states.

## 2024-05-14 - Custom Tooltips replacing native Title attributes
**Learning:** Native `title` attributes on UI elements like icon-only buttons are inaccessible to keyboard users and lack style consistency across browsers.
**Action:** Replace native `title` attributes with custom `<Tooltip>` elements (e.g., Radix UI Tooltip), ensure the wrapping `<TooltipProvider>` exists, and maintain `aria-label`s directly on the interactive elements for screen readers.

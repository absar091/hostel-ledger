## 2026-10-10 - Add Tooltips to Icon-only Buttons
**Learning:** Icon-only buttons often lack proper accessibility and visual context for desktop users. Radix UI Tooltips significantly enhance micro-UX, and combining them with `aria-label` ensures screen-reader compatibility without duplicating the native `title` attribute.
**Action:** When adding Radix UI tooltips to icon-only buttons, remember to include a descriptive `aria-label` on the button itself and remove any redundant native `title` attributes. Do not wrap the tooltip around the trigger conditionally; use the `open` prop if dynamic.

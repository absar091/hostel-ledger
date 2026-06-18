## 2024-05-19 - Removed native tooltips on Sidebar buttons
**Learning:** The Sidebar had native HTML `title` attributes on buttons which caused a "double-tooltip" effect or inconsistent visuals compared to the rest of the application that uses Radix UI Tooltips.
**Action:** Replaced native `title` attributes with Radix UI Tooltips for consistent styling, adding `delayDuration={0}` to ensure immediate feedback. Included ARIA labels where appropriate and removed native `title`.

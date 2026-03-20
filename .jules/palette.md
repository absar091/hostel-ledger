## 2024-03-20 - Keyboard Accessibility in Header
**Learning:** Native `<button>` elements used in custom headers (like `DesktopHeader.tsx`) often lack visible focus rings unless explicitly styled, making keyboard navigation difficult.
**Action:** Always append the established pattern `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to interactive custom components to ensure keyboard accessibility.

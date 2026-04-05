## 2024-04-05 - Avoiding native title double tooltips
**Learning:** When implementing Radix UI tooltips (`@/components/ui/tooltip`) on elements that already possess a native `title` attribute, always explicitly remove the native `title` attribute to prevent double-tooltips from appearing to the user.
**Action:** Removed the `title` attribute from the Settings button in `DesktopHeader` when wrapping it with a `Tooltip`.

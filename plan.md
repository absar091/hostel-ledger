1. **Explore `src/components/CreateGroupSheet.tsx` to find `title` attributes that can be updated.**
   - There are two `div` elements with `title` attributes:
     - `title="This person will receive an email invitation to join Hostel Ledger and this group."`
     - `title="This user already has a Hostel Ledger account. They'll receive an in-app invitation and email notification."`
   - I will replace the native `title` attributes with the Radix UI `<Tooltip>` component.
   - I need to import `Tooltip`, `TooltipContent`, `TooltipTrigger`, and `TooltipProvider` from `@/components/ui/tooltip`.
   - Wrap the `div` in `<TooltipTrigger asChild>`, and move the `title` text into the `<TooltipContent>`. Ensure that `<TooltipProvider>` wraps them or is added to the top level of the sheet if missing.
   - For `div` elements acting as tooltip triggers, I should also add `tabIndex={0}` to make them keyboard accessible.

2. **Complete pre-commit steps.**
   - Run formatting (`pnpm lint`), tests (`pnpm test`), and build (`pnpm build`). Make sure to check logs and resolve any issues. Use `&&` for the bash execution.

3. **Submit.**
   - Submit the changes using the PR format:
     - Title: `🎨 Palette: Replace native title attributes with Tooltips in CreateGroupSheet`
     - Description:
       - 💡 What: Replaced native browser `title` attributes with custom Radix UI Tooltips and added `tabIndex={0}` for keyboard accessibility on the invite items.
       - 🎯 Why: Native tooltips are often inaccessible, don't appear for keyboard users, and look inconsistent across browsers.
       - 📸 Before/After: Visual update to how tooltips look.
       - ♿ Accessibility: Added `tabIndex={0}` to the div elements acting as TooltipTriggers to allow keyboard navigation and screen reader support.

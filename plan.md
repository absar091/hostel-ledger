1. **Remove native `title` attributes**: I will remove all native `title` attributes on interactive elements (mostly buttons) in `src/components/Sidebar.tsx`, `src/components/CreateGroupSheet.tsx`, and `src/components/TransactionDetailModal.tsx`.
2. **Add Radix Tooltips**: I'll replace those native `title` attributes with the Radix UI `<Tooltip>` component.
    - I'll import `Tooltip`, `TooltipTrigger`, and `TooltipContent` from `@/components/ui/tooltip`.
    - I will make sure the trigger wraps the interactive element (`<TooltipTrigger asChild>`).
    - I will make sure not to include `<TooltipProvider>` inside the modified components if it is already wrapped globally (it is already in `App.tsx`).
    - For conditional tooltips (like in `Sidebar.tsx` where tooltips are only shown when collapsed), I will conditionally render the entire `<Tooltip>` component tree rather than just conditionally rendering `<TooltipContent>` or `TooltipTrigger`.
    - In `TransactionDetailModal.tsx`, the `Copy ID` button changes its tooltip conditionally (e.g. from "Copy Reference" to "Copied!"). I will ensure this uses the `open={isCopied ? true : undefined}` trick, and change the `__tests__/verify_copy_feedback.spec.ts` test since the locators in the test use the `title` attribute.
    - I will update `__tests__/verify_copy_feedback.spec.ts` to locate buttons via `aria-label` or `data-testid` instead of `title`. Actually, I'll update the button in `TransactionDetailModal.tsx` to have `aria-label="Copy Reference"` and `aria-label="Copied!"` respectively so the test can just be updated to look for `aria-label`. Wait, the test uses `button[title='Copy ID']` but the actual text in `TransactionDetailModal.tsx` is `"Copy Reference"`. I'll update the test to look for `"Copy Reference"`.
3. **Run tests and build**:
   - Ensure the app builds (`pnpm build`).
   - Run tests (`pnpm test`).
   - Run linter on the modified files (`npx eslint <files>`).
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit PR**: I'll create a PR describing the UX improvement using the Palette format.

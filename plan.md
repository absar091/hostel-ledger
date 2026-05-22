1. **Import Tooltip Components**:
   - In `src/components/TransactionDetailModal.tsx`, import `Tooltip`, `TooltipContent`, `TooltipProvider`, and `TooltipTrigger` from `@/components/ui/tooltip`.
2. **Update "Share as Image" Button**:
   - Wrap the button in a `<Tooltip>` and `<TooltipTrigger asChild>`.
   - Remove the `title="Share as Image"` attribute.
   - Add `aria-label="Share as Image"` to the `<button>`.
   - Add `<TooltipContent>` with the text "Share as Image".
3. **Update "Copy Reference" Button**:
   - Wrap the button in a `<Tooltip>` and `<TooltipTrigger asChild>`.
   - Remove the `title={isCopied ? "Copied!" : "Copy Reference"}` attribute.
   - Add `aria-label={isCopied ? "Copied!" : "Copy Reference"}` to the `<button>`.
   - Add `<TooltipContent>` with the text `{isCopied ? "Copied!" : "Copy Reference"}`.
4. **Update the Test `verify_copy_feedback.spec.ts`**:
   - Since we replaced the `title` attribute with a tooltip and `aria-label`, the Playwright test looking for `button[title='...']` will fail.
   - Update `src/components/__tests__/verify_copy_feedback.spec.ts` to use `page.getByRole('button', { name: ... })` or `page.locator('button[aria-label="..."]')` to locate the buttons instead of `title`.
5. **Pre-commit Steps**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit**:
   - Create a PR with the Palette format.

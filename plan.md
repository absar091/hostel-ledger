1. **Analyze accessibility of title attributes:** We need to replace native `title` attributes on interactive elements, like icon-only buttons, with custom Tooltip components (from Radix UI / Shadcn) to improve accessibility and aesthetics, while adding `aria-label` where the native title is removed. We will do this in `src/components/TransactionDetailModal.tsx`.

2. **Patch `src/components/TransactionDetailModal.tsx`:**
    - Replace the native `title="Share as Image"` on the Share button with `<Tooltip><TooltipTrigger asChild>...<TooltipContent>Share as Image</TooltipContent></Tooltip>`. Add `aria-label="Share as Image"`.
    - Replace `title={isCopied ? "Copied!" : "Copy Reference"}` on the Copy Reference button with a custom tooltip. Add `aria-label={isCopied ? "Copied!" : "Copy Reference"}`.
    - Ensure `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `TooltipProvider` are imported from `@/components/ui/tooltip`. Wrap the modal content or specific buttons in `TooltipProvider` if one is not present.

3. **Verify the changes:**
    - Build the project using `pnpm build`.
    - Run the linter using `pnpm lint`.
    - Run the test suite using `pnpm test`.

4. **Pre-commit step:**
    - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Journaling:**
    - Document this micro-UX learning in `.jules/palette.md` noting the importance of replacing native tooltips with accessible, custom tooltip components for icon-only buttons, and removing native `title` while maintaining `aria-label` for screen reader accessibility.

6. **Submit PR:**
    - Create a PR with title "🎨 Palette: Add custom accessible tooltips to icon buttons in transaction modal" and a description following the required format.

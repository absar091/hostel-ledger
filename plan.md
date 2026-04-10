1. **Update `src/pages/Activity.tsx` (Imports)**: Use `replace_with_git_merge_diff` to add `Tooltip, TooltipProvider, TooltipTrigger, TooltipContent` imports from `@/components/ui/tooltip`.
2. **Update `src/pages/Activity.tsx` (Provider)**: Use `replace_with_git_merge_diff` to wrap the entire return statement in `TooltipProvider`.
3. **Update `src/pages/Activity.tsx` (Button)**: Use `replace_with_git_merge_diff` to wrap the "discuss" button (`title={t('chat.discuss')}`) in a `Tooltip` component and replace the native `title` attribute.
4. **Update `src/pages/ToReceive.tsx` (Imports)**: Use `replace_with_git_merge_diff` to add `Tooltip, TooltipProvider, TooltipTrigger, TooltipContent` imports from `@/components/ui/tooltip`.
5. **Update `src/pages/ToReceive.tsx` (Provider)**: Use `replace_with_git_merge_diff` to wrap the entire return statement in `TooltipProvider`.
6. **Update `src/pages/ToReceive.tsx` (Button)**: Use `replace_with_git_merge_diff` to wrap the "Send Reminder" button (`title="Send Reminder"`) in a `Tooltip` component and replace the native `title` attribute.
7. **Run Verifications**: Explicitly execute `pnpm run build --mode development` and `pnpm lint` using the `run_in_bash_session` tool to verify the syntax and changes.
8. **Pre-commit Rule Complete**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
9. **Submit PR**: Submit the PR using the `submit` tool with the required format.

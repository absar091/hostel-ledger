1. **Add `Tooltip` imports to `src/components/Sidebar.tsx`**.
   - Use `replace_with_git_merge_diff` to add `import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";` at the top of the file.
   - Verify with `sed -n '1,15p' src/components/Sidebar.tsx`.
2. **Update navigation buttons in `src/components/Sidebar.tsx`**.
   - Use `replace_with_git_merge_diff` to wrap the `navItems` buttons in Tooltip.
   - Verify with `sed -n '89,145p' src/components/Sidebar.tsx`.
3. **Update Profile and Logout buttons in `src/components/Sidebar.tsx`**.
   - Use `replace_with_git_merge_diff` to wrap the Profile and Logout buttons in `<Tooltip>`.
   - Verify with `sed -n '150,195p' src/components/Sidebar.tsx`.
4. **Run linters and checks**.
   - Run `pnpm lint && pnpm test && pnpm run build --mode development`.
5. **Document learning**.
   - Use `run_in_bash_session` to write to `.jules/palette.md`.
6. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
7. **Submit the PR as Palette**.
   - Call `submit` with appropriate branch and commit messages.

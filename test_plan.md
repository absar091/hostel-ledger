1. **Identify the missing ARIA labels:** `GroupChat.tsx` contains multiple icon-only buttons (like those for closing previews, uploading images, toggling info, and sending messages) that lack `aria-label` or `title` attributes. This breaks accessibility for screen reader users and affects the overall UX.
2. **Review components:** I will add `aria-label` attributes to the following buttons in `src/components/GroupChat.tsx`:
   - The close hint button (`setShowTxnHint(false)`) -> `aria-label={t("chat.close_hint", "Close hint")}`
   - The remove referenced transaction button (`setReferencedTxn(null)`) -> `aria-label={t("chat.remove_reference", "Remove reference")}`
   - The remove attached image button (`setAttachedImage(null)`) -> `aria-label={t("chat.remove_image", "Remove image")}`
   - The image upload button -> `aria-label={t("chat.upload_image", "Upload image")}`
   - The transaction hint info button -> `aria-label={t("chat.toggle_hint", "Toggle transaction hint")}`
   - The send message button -> `aria-label={t("chat.send_message", "Send message")}`
3. **Verify changes:**
   - Run `pnpm lint` and `pnpm test` to ensure there are no breaking changes.
   - Run `pnpm build` to verify the build process completes without errors.
4. **Complete pre-commit steps:** Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
5. **Submit PR:** I will create a pull request with the title `🎨 Palette: Add ARIA labels to icon-only buttons in GroupChat` and a detailed description following the required format.

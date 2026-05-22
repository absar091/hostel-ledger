1. **Update `TransactionDetailModal.tsx` Imports**
   - Use `replace_with_git_merge_diff` to add the Tooltip import to `src/components/TransactionDetailModal.tsx`.
   ```
   <<<<<<< SEARCH
   import html2canvas from "html2canvas";
   import { useCurrency } from "@/contexts/CurrencyContext";
   =======
   import html2canvas from "html2canvas";
   import { useCurrency } from "@/contexts/CurrencyContext";
   import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
   >>>>>>> REPLACE
   ```

2. **Update 'Share as Image' Button in `TransactionDetailModal.tsx`**
   - Use `replace_with_git_merge_diff` to replace native title with a custom Tooltip.
   ```
   <<<<<<< SEARCH
                               <button
                                   onClick={handleShareAsImage}
                                   disabled={isGenerating}
                                   className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                   title="Share as Image"
                               >
                                   {isGenerating ? (
                                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                   ) : (
                                       <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                   )}
                               </button>
   =======
                               <Tooltip>
                                   <TooltipTrigger asChild>
                                       <button
                                           onClick={handleShareAsImage}
                                           disabled={isGenerating}
                                           className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                                           aria-label="Share as Image"
                                       >
                                           {isGenerating ? (
                                               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                           ) : (
                                               <Image className="w-4 lg:w-5 h-4 lg:h-5 text-white font-bold" />
                                           )}
                                       </button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                       <p>Share as Image</p>
                                   </TooltipContent>
                               </Tooltip>
   >>>>>>> REPLACE
   ```

3. **Update 'Copy Reference' Button in `TransactionDetailModal.tsx`**
   - Use `replace_with_git_merge_diff` to replace native title with a custom Tooltip.
   ```
   <<<<<<< SEARCH
                                           <button
                                               onClick={handleCopyId}
                                               className={`p-2 rounded-full transition-all ${isCopied
                                                   ? "bg-emerald-100 text-emerald-600 scale-110"
                                                   : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                   }`}
                                               title={isCopied ? "Copied!" : "Copy Reference"}
                                           >
                                               {isCopied ? (
                                                   <Check className="w-3.5 h-3.5" />
                                               ) : (
                                                   <Copy className="w-3.5 h-3.5" />
                                               )}
                                           </button>
   =======
                                           <Tooltip>
                                               <TooltipTrigger asChild>
                                                   <button
                                                       onClick={handleCopyId}
                                                       className={`p-2 rounded-full transition-all ${isCopied
                                                           ? "bg-emerald-100 text-emerald-600 scale-110"
                                                           : "bg-white text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 group-hover:border-emerald-200"
                                                           }`}
                                                       aria-label={isCopied ? "Copied!" : "Copy Reference"}
                                                   >
                                                       {isCopied ? (
                                                           <Check className="w-3.5 h-3.5" />
                                                       ) : (
                                                           <Copy className="w-3.5 h-3.5" />
                                                       )}
                                                   </button>
                                               </TooltipTrigger>
                                               <TooltipContent>
                                                   <p>{isCopied ? "Copied!" : "Copy Reference"}</p>
                                               </TooltipContent>
                                           </Tooltip>
   >>>>>>> REPLACE
   ```

4. **Update Playwright Test `verify_copy_feedback.spec.ts`**
   - Use `replace_with_git_merge_diff` to update locators to use `aria-label`. Wait, the locator in test was `button[title='Copy ID']`, but the app code has `"Copy Reference"`! So I should update the test to match `aria-label` and the correct text `Copy Reference`.
   ```
   <<<<<<< SEARCH
     // Find the Copy ID button (using the title attribute which is initially "Copy ID")
     const copyButton = page.locator("button[title='Copy ID']");

     // Click the copy button
     await copyButton.click();

     // Wait for the feedback state (icon change and title update)
     // The button's title should change to "Copied!"
     const copiedButton = page.locator("button[title='Copied!']");
   =======
     // Find the Copy ID button (using the aria-label attribute which is initially "Copy Reference" or "Copy ID")
     const copyButton = page.locator("button[aria-label='Copy Reference'], button[aria-label='Copy ID']");

     // Click the copy button
     await copyButton.click();

     // Wait for the feedback state (icon change and title update)
     // The button's aria-label should change to "Copied!"
     const copiedButton = page.locator("button[aria-label='Copied!']");
   >>>>>>> REPLACE
   ```

5. **Update Sidebar Toggle Button in `sidebar.tsx`**
   - Use `replace_with_git_merge_diff` to remove `title="Toggle Sidebar"` in `src/components/ui/sidebar.tsx` since `aria-label` already exists.
   ```
   <<<<<<< SEARCH
           aria-label="Toggle Sidebar"
           tabIndex={-1}
           onClick={toggleSidebar}
           title="Toggle Sidebar"
           className={cn(
   =======
           aria-label="Toggle Sidebar"
           tabIndex={-1}
           onClick={toggleSidebar}
           className={cn(
   >>>>>>> REPLACE
   ```

6. **Verify Changes**
   - Use `run_in_bash_session` to install dependencies and run verification scripts.
   - Command: `pnpm install && pnpm lint && pnpm test && pnpm build`

7. **Add Pre-commit Steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit PR**
   - Create a PR with title "🎨 Palette: Replace native tooltips with accessible custom tooltips" and description including What, Why, Before/After, and Accessibility sections.

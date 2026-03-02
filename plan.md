# Plan

1. **Investigate the code base for UX micro-improvements**:
    - Based on my memory regarding `TransactionItem`:
      > The `TransactionItem` component (`src/components/TransactionItem.tsx`) uses a clickable `<button>` wrapper that aggregates multiple internal text nodes (title, group, amount, date). It requires a comprehensive, dynamically generated `aria-label` combining these details to ensure screen readers announce the item as a single cohesive sentence rather than disjointed text.
    - So, I will modify `src/components/TransactionItem.tsx` to add an `aria-label` to the main `<button>`.

2. **Implement the change**:
    - Add `aria-label` on `TransactionItem.tsx` button.
      ```typescript
      const ariaLabel = `${transaction.title}. ${typeLabel}${groupName ? ` in ${groupName}` : ''} on ${dateDisplay}. Amount: ${transaction.type === "expense" && !isPayer && !isParticipant ? "0" : formatAmount(displayAmount)}. ${extraDescription}.`;
      ```

3. **Verify and Pre-commit**:
    - Run `pnpm lint` and `pnpm test` to ensure everything compiles and passes.

4. **Submit**:
    - Submit PR as Palette persona with the `🎨 Palette: ` prefix.

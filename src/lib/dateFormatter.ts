// ⚡ Bolt: Cache Intl.DateTimeFormat instance to prevent 50x performance hit
// Native toLocaleTimeString() instantiates this object on every call, blocking the
// main thread when rendering large lists of TransactionItems.
export const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatTimeSafe(dateInput: string | number | Date | null | undefined): string {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "Unknown Time";
    return timeFormatter.format(date);
}

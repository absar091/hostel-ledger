import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ⚡ Bolt: Cache Intl.DateTimeFormat instances to avoid repeated expensive instantiations during renders
export const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
});

// ⚡ Bolt: Cache secondary time formatter for compact displays
export const shortTimeFormatter = new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit'
});

// ⚡ Bolt: Helper function to safely format dates using the cached formatters
export function formatTimeSafely(dateInput: string | number | Date | null | undefined, formatter: Intl.DateTimeFormat): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? "" : formatter.format(date);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cache Intl.NumberFormat instances for significant performance improvements
// when formatting numbers, especially in long lists
const numberFormatCache = new Map<string, Intl.NumberFormat>();

export const formatNumber = (
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string => {
  const cacheKey = `${locale}-${JSON.stringify(options || {})}`;
  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(cacheKey, new Intl.NumberFormat(locale, options));
  }
  return numberFormatCache.get(cacheKey)!.format(value);
};

// Cached instances for Intl.DateTimeFormat
const defaultFormatter = new Intl.DateTimeFormat();

/**
 * Returns a fast formatted date string using a cached Intl.DateTimeFormat instance.
 * Safe fallback to "Unknown Date" if date string is invalid.
 */
export const formatDate = (dateString?: string | number | null, fallback = "Unknown Date"): string => {
  if (!dateString) return fallback;
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return fallback;
  return defaultFormatter.format(dt);
};

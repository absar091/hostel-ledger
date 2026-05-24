/**
 * Multi-Currency Support
 * Display-only currency formatting — amounts in DB remain raw numbers.
 */

export interface Currency {
    code: string;
    symbol: string;
    name: string;
    flag: string;
    position: 'prefix' | 'suffix';
    locale: string;
    decimals: number;
}

export const CURRENCIES: Currency[] = [
    { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', flag: '🇵🇰', position: 'prefix', locale: 'en-PK', decimals: 0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', position: 'prefix', locale: 'en-US', decimals: 2 },
    { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', position: 'prefix', locale: 'de-DE', decimals: 2 },
    { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', position: 'prefix', locale: 'en-GB', decimals: 2 },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', position: 'prefix', locale: 'en-IN', decimals: 0 },
    { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', position: 'prefix', locale: 'ar-SA', decimals: 2 },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', position: 'prefix', locale: 'ar-AE', decimals: 2 },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', position: 'prefix', locale: 'en-CA', decimals: 2 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', position: 'prefix', locale: 'en-AU', decimals: 2 },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', position: 'prefix', locale: 'tr-TR', decimals: 2 },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', position: 'prefix', locale: 'ms-MY', decimals: 2 },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', position: 'prefix', locale: 'zh-CN', decimals: 2 },
];

export const DEFAULT_CURRENCY = 'PKR';

export const getCurrency = (code: string): Currency => {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

/**
 * Cache for Intl.NumberFormat instances to significantly improve formatting performance.
 * toLocaleString instantiates a new Intl.NumberFormat every time, which is slow in loops/lists.
 */
const formattersCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (locale: string, decimals: number): Intl.NumberFormat => {
    const key = `${locale}-${decimals}`;
    if (formattersCache.has(key)) {
        return formattersCache.get(key)!;
    }
    const formatter = new Intl.NumberFormat(locale, decimals > 0 ? {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    } : {});
    formattersCache.set(key, formatter);
    return formatter;
};

/**
 * Format an amount with the given currency.
 * Examples: formatCurrency(500, 'PKR') => "Rs 500"
 *           formatCurrency(500, 'USD') => "$500.00"
 */
export const formatCurrency = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
    const currency = getCurrency(currencyCode);

    // Safety check: if amount is not a valid number (e.g. undefined/null coerced, or NaN)
    // Intl.NumberFormat.format throws on NaN/undefined if passed directly in strict mode or causes unexpected behavior.
    // However, JS Number() coercion or Number.isNaN check is safe.
    const safeAmount = Number(amount);
    if (Number.isNaN(safeAmount)) {
        return '';
    }
    const absAmount = Math.abs(safeAmount);

    // Format the number using cached Intl.NumberFormat
    const formatter = getFormatter(currency.locale, currency.decimals);
    const formatted = formatter.format(absAmount);

    // Apply sign
    const sign = safeAmount < 0 ? '-' : '';

    // Position symbol
    if (currency.position === 'suffix') {
        return `${sign}${formatted} ${currency.symbol}`;
    }

    // Special case: multi-char symbols get a space after
    const space = currency.symbol.length > 1 ? ' ' : '';
    return `${sign}${currency.symbol}${space}${formatted}`;
};

/**
 * Get just the currency symbol for inline use
 */
export const getCurrencySymbol = (currencyCode: string = DEFAULT_CURRENCY): string => {
    return getCurrency(currencyCode).symbol;
};

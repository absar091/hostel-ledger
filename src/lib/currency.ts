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
 * Format an amount with the given currency.
 * Examples: formatCurrency(500, 'PKR') => "Rs 500"
 *           formatCurrency(500, 'USD') => "$500.00"
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();

export const formatCurrency = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
    const currency = getCurrency(currencyCode);
    const absAmount = Math.abs(amount);

    // Cache formatter based on locale and decimals to avoid expensive repeated instantiation
    const cacheKey = `${currency.locale}-${currency.decimals}`;
    let formatter = numberFormatCache.get(cacheKey);
    if (!formatter) {
        formatter = new Intl.NumberFormat(currency.locale, {
            minimumFractionDigits: currency.decimals,
            maximumFractionDigits: currency.decimals,
        });
        numberFormatCache.set(cacheKey, formatter);
    }

    // Format the number
    const formatted = formatter.format(absAmount);

    // Apply sign
    const sign = amount < 0 ? '-' : '';

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

import { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useFirebaseAuth } from './FirebaseAuthContext';
import { formatCurrency as formatCurrencyUtil, getCurrency, getCurrencySymbol, DEFAULT_CURRENCY, type Currency } from '@/lib/currency';

interface CurrencyContextType {
    /** The user's selected currency code (e.g., 'PKR', 'USD') */
    currencyCode: string;
    /** Full currency object */
    currency: Currency;
    /** Format an amount using the user's currency: formatAmount(500) => "Rs 500" */
    formatAmount: (amount: number) => string;
    /** Get just the symbol: "Rs", "$", "€" */
    symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useFirebaseAuth();

    const currencyCode = user?.currency || DEFAULT_CURRENCY;
    const currency = getCurrency(currencyCode);
    const symbol = getCurrencySymbol(currencyCode);

    const formatAmount = useCallback((amount: number): string => {
        return formatCurrencyUtil(amount, currencyCode);
    }, [currencyCode]);

    // Optimization: Memoize the context value to prevent unnecessary re-renders in consuming components
    // (like TimelineItem) when the parent provider re-renders but currency data hasn't changed.
    const value = useMemo(() => ({
        currencyCode,
        currency,
        formatAmount,
        symbol
    }), [currencyCode, currency, formatAmount, symbol]);

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (!context) {
        // Fallback for components rendered outside the provider
        return {
            currencyCode: DEFAULT_CURRENCY,
            currency: getCurrency(DEFAULT_CURRENCY),
            formatAmount: (amount: number) => formatCurrencyUtil(amount, DEFAULT_CURRENCY),
            symbol: getCurrencySymbol(DEFAULT_CURRENCY),
        };
    }
    return context;
};

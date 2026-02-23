import { createContext, useContext, ReactNode, useMemo } from 'react';
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

    // Memoize the context value to prevent unnecessary re-renders in consumers
    // when unrelated user data changes (e.g. balance updates).
    const value = useMemo(() => {
        const currency = getCurrency(currencyCode);
        const symbol = getCurrencySymbol(currencyCode);

        const formatAmount = (amount: number): string => {
            return formatCurrencyUtil(amount, currencyCode);
        };

        return { currencyCode, currency, formatAmount, symbol };
    }, [currencyCode]);

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

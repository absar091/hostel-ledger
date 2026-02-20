import { describe, it, expect } from 'vitest';
import { getCurrency, formatCurrency, CURRENCIES } from '../currency';

describe('currency', () => {
    describe('getCurrency', () => {
        it('should return the correct currency for a valid code', () => {
            const currency = getCurrency('USD');
            expect(currency).toBeDefined();
            expect(currency.code).toBe('USD');
            expect(currency.symbol).toBe('$');
            expect(currency.decimals).toBe(2);
        });

        it('should return the default currency (PKR) for an unknown code', () => {
            const currency = getCurrency('UNKNOWN_CODE');
            expect(currency).toBeDefined();
            expect(currency.code).toBe('PKR'); // Default
        });

        it('should return the default currency for an empty string', () => {
            const currency = getCurrency('');
            expect(currency).toBeDefined();
            expect(currency.code).toBe('PKR'); // Default
        });

        it('should be case-sensitive and return default if case does not match (unless implementation changes)', () => {
            // current implementation is case-sensitive: c.code === code
            const currency = getCurrency('usd');
            expect(currency.code).toBe('PKR'); // falls back to default because 'usd' != 'USD'
        });
    });

    describe('formatCurrency', () => {
        it('should format amount with default currency if code is not provided', () => {
            // Default is PKR
            expect(formatCurrency(100)).toBe('Rs 100');
        });

        it('should format amount with specified currency', () => {
            expect(formatCurrency(100, 'USD')).toBe('$100.00');
        });

        it('should handle zero decimals correctly', () => {
            expect(formatCurrency(100, 'PKR')).toBe('Rs 100');
            expect(formatCurrency(100, 'INR')).toBe('₹100');
        });

        it('should handle non-zero decimals correctly', () => {
            expect(formatCurrency(100.5, 'USD')).toBe('$100.50');
            expect(formatCurrency(100.555, 'USD')).toBe('$100.56'); // rounding
        });

        it('should handle negative amounts', () => {
            expect(formatCurrency(-100, 'USD')).toBe('-$100.00');
            expect(formatCurrency(-100, 'PKR')).toBe('-Rs 100');
        });

        it('should handle large numbers', () => {
            expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
            expect(formatCurrency(1000000, 'PKR')).toBe('Rs 1,000,000');
        });
    });
});

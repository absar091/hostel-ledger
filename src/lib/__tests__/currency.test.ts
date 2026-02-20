import { describe, it, expect } from 'vitest';
import { formatCurrency, getCurrency, CURRENCIES, Currency } from '../currency';

describe('currency', () => {
    describe('getCurrency', () => {
        it('should return the correct currency object for a valid code', () => {
            const usd = getCurrency('USD');
            expect(usd).toBeDefined();
            expect(usd.code).toBe('USD');
            expect(usd.symbol).toBe('$');
        });

        it('should return the default currency (PKR) for an invalid code', () => {
            const invalid = getCurrency('XYZ');
            expect(invalid).toBeDefined();
            expect(invalid.code).toBe('PKR');
        });

        it('should return the default currency (PKR) for an empty code', () => {
            const empty = getCurrency('');
            expect(empty).toBeDefined();
            expect(empty.code).toBe('PKR');
        });
    });

    describe('formatCurrency', () => {
        it('should format USD correctly', () => {
            expect(formatCurrency(100, 'USD')).toBe('$100.00');
            expect(formatCurrency(100.50, 'USD')).toBe('$100.50');
            expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
        });

        it('should format EUR correctly (locale specific)', () => {
            expect(formatCurrency(1500.50, 'EUR')).toBe('€1.500,50');
        });

        it('should format PKR correctly', () => {
            expect(formatCurrency(500, 'PKR')).toBe('Rs 500');
            expect(formatCurrency(1500, 'PKR')).toBe('Rs 1,500');
        });

        it('should use default currency if code is omitted', () => {
            expect(formatCurrency(500)).toBe('Rs 500');
        });

        it('should use default currency if code is invalid', () => {
            expect(formatCurrency(500, 'INVALID')).toBe('Rs 500');
        });

        it('should handle negative values correctly', () => {
            expect(formatCurrency(-50, 'USD')).toBe('-$50.00');
            expect(formatCurrency(-500, 'PKR')).toBe('-Rs 500');
        });

        it('should handle zero correctly', () => {
            expect(formatCurrency(0, 'USD')).toBe('$0.00');
            expect(formatCurrency(0, 'PKR')).toBe('Rs 0');
        });

        it('should handle large numbers correctly', () => {
            // Verify thousands separator logic for large numbers
            expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
            expect(formatCurrency(1000000, 'PKR')).toBe('Rs 1,000,000');
        });

        it('should handle suffix position currencies', () => {
            // Add a temporary suffix currency to the exported array
            const suffixCurrency: Currency = {
                code: 'TEST',
                symbol: 'T',
                name: 'Test Currency',
                flag: '🏳️',
                position: 'suffix',
                locale: 'en-US',
                decimals: 2
            };

            CURRENCIES.push(suffixCurrency);

            try {
                expect(formatCurrency(100, 'TEST')).toBe('100.00 T');
                expect(formatCurrency(-50, 'TEST')).toBe('-50.00 T');
            } finally {
                // Clean up
                const index = CURRENCIES.findIndex(c => c.code === 'TEST');
                if (index > -1) {
                    CURRENCIES.splice(index, 1);
                }
            }
        });
    });
});

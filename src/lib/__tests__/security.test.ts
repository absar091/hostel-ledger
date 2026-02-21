import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, validateCSRFToken, sanitizeInput } from '../security';

describe('RateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should allow requests within limit', () => {
        const limiter = new RateLimiter(3, 1000); // 3 attempts per 1000ms
        const userId = 'user1';

        expect(limiter.isAllowed(userId)).toBe(true); // 1st
        expect(limiter.isAllowed(userId)).toBe(true); // 2nd
        expect(limiter.isAllowed(userId)).toBe(true); // 3rd
    });

    it('should block requests exceeding limit', () => {
        const limiter = new RateLimiter(3, 1000);
        const userId = 'user1';

        limiter.isAllowed(userId); // 1
        limiter.isAllowed(userId); // 2
        limiter.isAllowed(userId); // 3

        expect(limiter.isAllowed(userId)).toBe(false); // 4th - blocked
    });

    it('should reset after windowMs passes', () => {
        const limiter = new RateLimiter(3, 1000);
        const userId = 'user1';

        // Exhaust limit
        limiter.isAllowed(userId);
        limiter.isAllowed(userId);
        limiter.isAllowed(userId);
        expect(limiter.isAllowed(userId)).toBe(false);

        // Advance time past window
        vi.advanceTimersByTime(1001);

        // Should be allowed again
        expect(limiter.isAllowed(userId)).toBe(true);
    });

    it('should track identifiers independently', () => {
        const limiter = new RateLimiter(1, 1000);

        expect(limiter.isAllowed('user1')).toBe(true);
        expect(limiter.isAllowed('user1')).toBe(false); // user1 blocked

        expect(limiter.isAllowed('user2')).toBe(true); // user2 allowed
    });

    it('should update lastAttempt on successful calls (extending the window)', () => {
        const limiter = new RateLimiter(2, 1000);
        const userId = 'user1';

        // T=0
        expect(limiter.isAllowed(userId)).toBe(true); // count=1, last=0

        // Advance to T=800
        vi.advanceTimersByTime(800);

        // T=800. 800 - 0 < 1000. Not reset.
        expect(limiter.isAllowed(userId)).toBe(true); // count=2, last=800.

        // Advance to T=1200 (400ms later)
        vi.advanceTimersByTime(400);

        // T=1200.
        // If it was based on first attempt (T=0), 1200-0 > 1000, so it would reset.
        // But logic relies on lastAttempt (T=800). 1200-800 = 400 < 1000.
        // So it should NOT reset.
        expect(limiter.isAllowed(userId)).toBe(false);

        // Advance to T=1801 (601ms later)
        vi.advanceTimersByTime(601);
        // T=1801. 1801 - 800 = 1001 > 1000. Reset.
        expect(limiter.isAllowed(userId)).toBe(true);
    });

    describe('getRemainingTime', () => {
        it('should return 0 when not blocked', () => {
            const limiter = new RateLimiter(3, 1000);
            limiter.isAllowed('user1');
            expect(limiter.getRemainingTime('user1')).toBe(0);
        });

        it('should return correct remaining time when blocked', () => {
            const limiter = new RateLimiter(2, 1000);
            const userId = 'user1';

            limiter.isAllowed(userId); // T=0
            vi.advanceTimersByTime(500);
            limiter.isAllowed(userId); // T=500. Blocked after this.

            // T=500. Last attempt was 500.
            // Remaining should be 1000 - (500-500) = 1000?
            // Wait, getRemainingTime logic:
            // elapsed = now - lastAttempt.
            // max(0, windowMs - elapsed).

            // At T=500, elapsed = 0. Remaining = 1000.
            expect(limiter.getRemainingTime(userId)).toBe(1000);

            // Advance 200ms. T=700.
            vi.advanceTimersByTime(200);
            // Elapsed = 700 - 500 = 200.
            // Remaining = 1000 - 200 = 800.
            expect(limiter.getRemainingTime(userId)).toBe(800);
        });

        it('should return 0 when window expires', () => {
            const limiter = new RateLimiter(1, 1000);
            limiter.isAllowed('user1'); // T=0

            vi.advanceTimersByTime(1001);
            // T=1001. Elapsed=1001. Remaining = 0.
            expect(limiter.getRemainingTime('user1')).toBe(0);
        });
    });
});

describe('validateCSRFToken', () => {
    it('should return true for matching tokens', () => {
        const token = 'abc123xyz';
        expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('should return false for non-matching tokens', () => {
        expect(validateCSRFToken('token1', 'token2')).toBe(false);
    });

    it('should return false when token is empty', () => {
        expect(validateCSRFToken('', 'validToken')).toBe(false);
    });

    it('should return false when expectedToken is empty', () => {
        expect(validateCSRFToken('validToken', '')).toBe(false);
    });

    it('should return false when both are empty', () => {
        expect(validateCSRFToken('', '')).toBe(false);
    });
});

describe('sanitizeInput', () => {
    it('should return empty string for non-string input', () => {
        // @ts-ignore
        expect(sanitizeInput(null)).toBe('');
        // @ts-ignore
        expect(sanitizeInput(undefined)).toBe('');
        // @ts-ignore
        expect(sanitizeInput(123)).toBe('');
        // @ts-ignore
        expect(sanitizeInput({})).toBe('');
    });

    it('should return empty string for empty input', () => {
        expect(sanitizeInput('')).toBe('');
    });

    it('should trim whitespace', () => {
        expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should sanitize HTML special characters', () => {
        expect(sanitizeInput('<')).toBe('&lt;');
        expect(sanitizeInput('>')).toBe('&gt;');
        expect(sanitizeInput('"')).toBe('&quot;');
        expect(sanitizeInput("'")).toBe('&#x27;');
        expect(sanitizeInput('&')).toBe('&amp;');
    });

    it('should sanitize common XSS vectors', () => {
        expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('should sanitize mixed content', () => {
        expect(sanitizeInput('Hello <script> World')).toBe('Hello &lt;script&gt; World');
    });

    it('should truncate input to 1000 characters', () => {
        const longString = 'a'.repeat(1005);
        const sanitized = sanitizeInput(longString);
        expect(sanitized.length).toBe(1000);
        expect(sanitized).toBe('a'.repeat(1000));
    });

    it('should handle multiple special characters', () => {
        expect(sanitizeInput('<<>>""\'\'&&')).toBe('&lt;&lt;&gt;&gt;&quot;&quot;&#x27;&#x27;&amp;&amp;');
    });
});

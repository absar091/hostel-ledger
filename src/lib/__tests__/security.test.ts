import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, validateCSRFToken, generateCSRFToken } from '../security';

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

describe('generateCSRFToken', () => {
    it('should generate a string of length 64', () => {
        const token = generateCSRFToken();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(64);
    });

    it('should generate a valid hex string', () => {
        const token = generateCSRFToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
        const token1 = generateCSRFToken();
        const token2 = generateCSRFToken();
        expect(token1).not.toBe(token2);
    });

    it('should use crypto.getRandomValues', () => {
        const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');
        generateCSRFToken();
        expect(getRandomValuesSpy).toHaveBeenCalled();
        const callArgs = getRandomValuesSpy.mock.calls[0][0];
        expect(callArgs).toBeInstanceOf(Uint8Array);
        expect(callArgs.length).toBe(32);
        getRandomValuesSpy.mockRestore();
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

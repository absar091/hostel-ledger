// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return the initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should update the value after the specified delay', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        expect(result.current).toBe('initial');

        rerender({ value: 'updated', delay: 500 });

        // Value should not update immediately
        expect(result.current).toBe('initial');

        // Fast-forward time by 400ms (less than delay)
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(result.current).toBe('initial');

        // Fast-forward time by another 100ms (reaching delay)
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(result.current).toBe('updated');
    });

    it('should use the default delay of 500ms if not provided', () => {
         const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
            initialProps: { value: 'initial' },
        });

        rerender({ value: 'updated' });
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(499);
        });
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe('updated');
    });

    it('should reset the timer if value changes within the delay period', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'initial', delay: 500 },
        });

        rerender({ value: 'update1', delay: 500 });

        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current).toBe('initial');

        // Update value again before the first timer fires
        rerender({ value: 'update2', delay: 500 });

        act(() => {
            vi.advanceTimersByTime(300);
        });
        // 300 + 300 = 600ms total, but the timer should have been reset at 300ms
        // so only 300ms passed for 'update2'
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(200);
        });
        // Now 500ms passed since 'update2'
        expect(result.current).toBe('update2');
    });
});

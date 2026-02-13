import { describe, it, expect, vi } from 'vitest';
import { arePropsEqual } from '../TimelineItem';

describe('TimelineItem arePropsEqual', () => {
  // Use 'expense' as const to satisfy TypeScript literal type if checked,
  // though in runtime test it's just a string.
  const baseProps: any = {
    type: 'expense',
    title: 'Dinner',
    amount: 500,
    date: '2023-10-27',
    paidBy: 'user1',
    participants: [{ name: 'user2', amount: 250 }],
    category: 'food'
  };

  it('should return true for identical props', () => {
    expect(arePropsEqual(baseProps, baseProps)).toBe(true);
  });

  it('should return true for props with same content but different object references (participants)', () => {
    const props1 = { ...baseProps, participants: [{ name: 'user2', amount: 250 }] };
    const props2 = { ...baseProps, participants: [{ name: 'user2', amount: 250 }] };

    // Ensure references are different
    expect(props1.participants).not.toBe(props2.participants);

    expect(arePropsEqual(props1, props2)).toBe(true);
  });

  it('should return false when a primitive prop changes', () => {
    const props1 = { ...baseProps };
    const props2 = { ...baseProps, amount: 600 };
    expect(arePropsEqual(props1, props2)).toBe(false);
  });

  it('should return false when participants content changes', () => {
    const props1 = { ...baseProps, participants: [{ name: 'user2', amount: 250 }] };
    const props2 = { ...baseProps, participants: [{ name: 'user2', amount: 300 }] };
    expect(arePropsEqual(props1, props2)).toBe(false);
  });

  it('should return false when participants array length changes', () => {
    const props1 = { ...baseProps, participants: [{ name: 'user2', amount: 250 }] };
    const props2 = { ...baseProps, participants: [{ name: 'user2', amount: 250 }, { name: 'user3', amount: 0 }] };
    expect(arePropsEqual(props1, props2)).toBe(false);
  });

  it('should return false when onClick reference changes', () => {
    const fn1 = () => {};
    const fn2 = () => {};
    const props1 = { ...baseProps, onClick: fn1 };
    const props2 = { ...baseProps, onClick: fn2 };
    expect(arePropsEqual(props1, props2)).toBe(false);
  });

  it('should return true when onClick reference is the same', () => {
    const fn1 = () => {};
    const props1 = { ...baseProps, onClick: fn1 };
    const props2 = { ...baseProps, onClick: fn1 };
    expect(arePropsEqual(props1, props2)).toBe(true);
  });
});

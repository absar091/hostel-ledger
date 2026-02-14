import { describe, it, expect } from 'vitest';
import { validateExpenseData } from '../validation';

describe('validateExpenseData', () => {
  it('should be valid for correct data', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: 'Dinner',
      place: 'Restaurant'
    };

    const result = validateExpenseData(data);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should be valid with empty note and place', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };

    const result = validateExpenseData(data);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error if groupId is missing', () => {
    const data = {
      groupId: '',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Group is required');
  });

  it('should return error if amount is 0', () => {
    const data = {
      groupId: 'group123',
      amount: 0,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Amount must be a positive number');
  });

  it('should return error if amount is negative', () => {
    const data = {
      groupId: 'group123',
      amount: -50,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Amount must be a positive number');
  });

  it('should return error if amount is NaN', () => {
    const data = {
      groupId: 'group123',
      amount: NaN,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Amount must be a positive number');
  });

  it('should return error if amount is too large', () => {
    const data = {
      groupId: 'group123',
      amount: 2000000,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Amount cannot exceed 1,000,000');
  });

  it('should return error if paidBy is missing', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: '',
      participants: ['user1', 'user2'],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please select who paid');
  });

  it('should return error if participants list is empty', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user1',
      participants: [],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Please select at least one participant');
  });

  it('should return error if note is too long', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: 'a'.repeat(201),
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Note must be less than 200 characters');
  });

  it('should return error if place is too long', () => {
    const data = {
      groupId: 'group123',
      amount: 100,
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      note: '',
      place: 'a'.repeat(101)
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Place must be less than 100 characters');
  });

  it('should return multiple errors if multiple fields are invalid', () => {
    const data = {
      groupId: '',
      amount: -100,
      paidBy: '',
      participants: [],
      note: '',
      place: ''
    };
    const result = validateExpenseData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Group is required');
    expect(result.errors).toContain('Amount must be a positive number');
    expect(result.errors).toContain('Please select who paid');
    expect(result.errors).toContain('Please select at least one participant');
  });
});

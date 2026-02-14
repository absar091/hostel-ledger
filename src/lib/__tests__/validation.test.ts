import { describe, it, expect } from 'vitest';
import { validateGroupData } from '../validation';

describe('validateGroupData', () => {
    // Happy Path
    it('should validate valid group data', () => {
        const data = {
            name: 'Trip to Northern Areas',
            emoji: '🏔️',
            members: [
                { name: 'Alice', phone: '03001234567' },
                { name: 'Bob' }, // Optional phone
            ],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    // Group Name Validation
    it('should return error if group name is missing', () => {
        const data = {
            name: '',
            emoji: '🏔️',
            members: [{ name: 'Alice' }],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Group name is required');
    });

    it('should return error if group name is too long', () => {
        const data = {
            name: 'A'.repeat(51),
            emoji: '🏔️',
            members: [{ name: 'Alice' }],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Group name must be less than 50 characters');
    });

    // Emoji Validation
    it('should return error if emoji is missing', () => {
        const data = {
            name: 'Trip',
            emoji: '',
            members: [{ name: 'Alice' }],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please select an emoji for the group');
    });

    // Members Validation
    it('should return error if members list is empty', () => {
        const data = {
            name: 'Trip',
            emoji: '🏔️',
            members: [],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please add at least one member');
    });

    it('should return error if member name is missing', () => {
        const data = {
            name: 'Trip',
            emoji: '🏔️',
            members: [{ name: '' }],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Member 1 name is required');
    });

    it('should return error if member name is too long', () => {
        const data = {
            name: 'Trip',
            emoji: '🏔️',
            members: [{ name: 'A'.repeat(51) }],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Member 1 name must be less than 50 characters');
    });

    // Phone Number Validation
    it('should validate correct phone numbers', () => {
        const validPhones = ['03001234567', '+923001234567', '3001234567'];

        validPhones.forEach((phone) => {
            const result = validateGroupData({
                name: 'Trip',
                emoji: '🏔️',
                members: [{ name: 'Alice', phone }],
            });
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    it('should return error for invalid phone numbers', () => {
        const invalidPhones = ['12345', '0300-1234567', 'abc', '02001234567'];

        invalidPhones.forEach((phone) => {
             const result = validateGroupData({
                name: 'Trip',
                emoji: '🏔️',
                members: [{ name: 'Alice', phone }],
            });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Member 1 phone number is invalid');
        });
    });

    // Duplicate Names
    it('should return error for duplicate member names', () => {
        const data = {
            name: 'Trip',
            emoji: '🏔️',
            members: [
                { name: 'Alice' },
                { name: 'alice' }, // Case insensitive check
            ],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Member names must be unique');
    });

     it('should return error for duplicate member names with trimming', () => {
        const data = {
            name: 'Trip',
            emoji: '🏔️',
            members: [
                { name: 'Alice ' },
                { name: ' Alice' },
            ],
        };

        const result = validateGroupData(data);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Member names must be unique');
    });
});

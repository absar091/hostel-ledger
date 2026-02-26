import { describe, it, expect } from 'vitest';
import { validateCreateGroup, isValidFirebaseId } from '../../utils/validation';

describe('validateCreateGroup', () => {
  it('should pass with valid minimal input', () => {
    const validBody = {
      name: 'Test Group',
      members: [{ name: 'Alice' }]
    };
    expect(validateCreateGroup(validBody)).toBeNull();
  });

  it('should pass with valid full input', () => {
    const validBody = {
      name: 'Full Group',
      emoji: '👍',
      coverPhoto: 'https://example.com/photo.jpg',
      members: [
        { name: 'Alice', uid: 'user1', type: 'registered' },
        { name: 'Bob', email: 'bob@example.com' }
      ],
      invitedUsernames: ['charlie', 'dave'],
      invitedEmails: ['eve@example.com']
    };
    expect(validateCreateGroup(validBody)).toBeNull();
  });

  it('should fail if name is missing', () => {
    const invalidBody = { members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('Group name is required');
  });

  it('should fail if name is not a string', () => {
    const invalidBody = { name: 123, members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('must be a non-empty string');
  });

  it('should fail if name is empty', () => {
    const invalidBody = { name: '   ', members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('must be a non-empty string');
  });

  it('should fail if name is too long', () => {
    const longName = 'a'.repeat(51);
    const invalidBody = { name: longName, members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('50 characters or less');
  });

  it('should fail if emoji is not a string', () => {
    const invalidBody = { name: 'Group', emoji: 123, members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('Emoji must be a string');
  });

  it('should fail if emoji is too long', () => {
    const invalidBody = { name: 'Group', emoji: 'toolongemojistring', members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('10 characters or less');
  });

  it('should fail if coverPhoto is not a string', () => {
    const invalidBody = { name: 'Group', coverPhoto: 123, members: [{ name: 'Alice' }] };
    expect(validateCreateGroup(invalidBody)).toContain('Cover photo must be a string');
  });

  it('should fail if members is not an array', () => {
    const invalidBody = { name: 'Group', members: 'not-array' };
    expect(validateCreateGroup(invalidBody)).toContain('Members must be an array');
  });

  it('should fail if member item is not an object', () => {
    const invalidBody = { name: 'Group', members: ['string-member'] };
    expect(validateCreateGroup(invalidBody)).toContain('must be an object');
  });

  it('should fail if member item is missing name', () => {
    const invalidBody = { name: 'Group', members: [{ email: 'test@example.com' }] };
    expect(validateCreateGroup(invalidBody)).toContain('missing a valid name');
  });

  it('should fail if member item has invalid fields', () => {
    const invalidBody = { name: 'Group', members: [{ name: 'Alice', uid: 123 }] };
    expect(validateCreateGroup(invalidBody)).toContain('invalid uid');
  });

  it('should fail if invitedUsernames is not an array', () => {
    const invalidBody = { name: 'Group', invitedUsernames: 'user1' };
    expect(validateCreateGroup(invalidBody)).toContain('Invited usernames must be an array');
  });

  it('should fail if invitedUsernames contains non-string', () => {
    const invalidBody = { name: 'Group', invitedUsernames: [123] };
    expect(validateCreateGroup(invalidBody)).toContain('must be a non-empty string');
  });

  it('should fail if invitedEmails is not an array', () => {
    const invalidBody = { name: 'Group', invitedEmails: 'email@test.com' };
    expect(validateCreateGroup(invalidBody)).toContain('Invited emails must be an array');
  });

  it('should fail if invitedEmails contains invalid email', () => {
    const invalidBody = { name: 'Group', invitedEmails: ['invalid-email'] };
    expect(validateCreateGroup(invalidBody)).toContain('is invalid');
  });

  it('should fail if no members or invites are provided', () => {
    const invalidBody = { name: 'Group', members: [], invitedUsernames: [], invitedEmails: [] };
    expect(validateCreateGroup(invalidBody)).toContain('Please add at least one member');
  });

  it('should fail if members array exceeds limit (50)', () => {
    const tooManyMembers = new Array(51).fill({ name: 'User' });
    const invalidBody = { name: 'Group', members: tooManyMembers };
    expect(validateCreateGroup(invalidBody)).toContain('Too many members');
  });

  it('should fail if invitedUsernames array exceeds limit (50)', () => {
    const tooManyUsernames = new Array(51).fill('user');
    const invalidBody = { name: 'Group', invitedUsernames: tooManyUsernames };
    expect(validateCreateGroup(invalidBody)).toContain('Too many invited usernames');
  });

  it('should fail if invitedEmails array exceeds limit (50)', () => {
    const tooManyEmails = new Array(51).fill('user@example.com');
    const invalidBody = { name: 'Group', invitedEmails: tooManyEmails };
    expect(validateCreateGroup(invalidBody)).toContain('Too many invited emails');
  });

  it('should fail if body is missing', () => {
    expect(validateCreateGroup(undefined)).toContain('missing or invalid');
    expect(validateCreateGroup(null)).toContain('missing or invalid');
  });
});

describe('isValidFirebaseId', () => {
  it('should return true for valid Firebase Push IDs', () => {
    expect(isValidFirebaseId('-N5s8j2k3l4m5n6o7p8q')).toBe(true);
    expect(isValidFirebaseId('valid_id_123')).toBe(true);
    expect(isValidFirebaseId('user-id-123')).toBe(true);
    expect(isValidFirebaseId('abcXYZ123-_')).toBe(true);
  });

  it('should return false for IDs with path traversal characters', () => {
    expect(isValidFirebaseId('../users')).toBe(false);
    expect(isValidFirebaseId('users/123')).toBe(false);
    expect(isValidFirebaseId('/etc/passwd')).toBe(false);
    expect(isValidFirebaseId('..')).toBe(false);
  });

  it('should return false for IDs with forbidden characters', () => {
    expect(isValidFirebaseId('user.name')).toBe(false);
    expect(isValidFirebaseId('user#name')).toBe(false);
    expect(isValidFirebaseId('user$name')).toBe(false);
    expect(isValidFirebaseId('user[name]')).toBe(false);
    expect(isValidFirebaseId('user\\name')).toBe(false);
  });

  it('should return false for empty or non-string inputs', () => {
    expect(isValidFirebaseId('')).toBe(false);
    expect(isValidFirebaseId(null)).toBe(false);
    expect(isValidFirebaseId(undefined)).toBe(false);
    expect(isValidFirebaseId(123)).toBe(false);
    expect(isValidFirebaseId({})).toBe(false);
  });

  it('should return false for overly long IDs', () => {
    const longId = 'a'.repeat(129);
    expect(isValidFirebaseId(longId)).toBe(false);
  });
});

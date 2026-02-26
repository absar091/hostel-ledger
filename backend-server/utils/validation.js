/**
 * Validates the request body for creating a group.
 * @param {Object} body - The request body.
 * @returns {string|null} - Error message if invalid, null if valid.
 */
function validateCreateGroup(body) {
  // If body is missing entirely
  if (!body || typeof body !== 'object') {
    return 'Request body is missing or invalid.';
  }

  const { name, emoji, members, invitedUsernames, invitedEmails, coverPhoto } = body;
  const MAX_ITEMS = 50;

  // 1. Validate Name (Required)
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Group name is required and must be a non-empty string.';
  }
  if (name.length > 50) {
    return 'Group name must be 50 characters or less.';
  }

  // 2. Validate Emoji (Optional)
  if (emoji !== undefined && emoji !== null) {
    if (typeof emoji !== 'string') {
      return 'Emoji must be a string.';
    }
    if (emoji.length > 10) {
      return 'Emoji must be 10 characters or less.';
    }
  }

  // 3. Validate Cover Photo (Optional)
  if (coverPhoto !== undefined && coverPhoto !== null) {
    if (typeof coverPhoto !== 'string') {
      return 'Cover photo must be a string URL.';
    }
  }

  // 4. Validate Members (Optional Array)
  if (members !== undefined && members !== null) {
    if (!Array.isArray(members)) {
      return 'Members must be an array.';
    }
    if (members.length > MAX_ITEMS) {
      return `Too many members. Maximum allowed is ${MAX_ITEMS}.`;
    }
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (typeof m !== 'object' || m === null) {
        return `Member at index ${i} must be an object.`;
      }
      if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
        return `Member at index ${i} is missing a valid name.`;
      }

      // Optional: Check other fields if critical, but code only relies on name mostly
      // m.uid, m.username, m.type, m.email are used if present
      if (m.uid && typeof m.uid !== 'string') return `Member at index ${i} has invalid uid.`;
      if (m.username && typeof m.username !== 'string') return `Member at index ${i} has invalid username.`;
      if (m.type && typeof m.type !== 'string') return `Member at index ${i} has invalid type.`;
      if (m.email && typeof m.email !== 'string') return `Member at index ${i} has invalid email.`;
    }
  }

  // 5. Validate Invited Usernames (Optional Array)
  if (invitedUsernames !== undefined && invitedUsernames !== null) {
    if (!Array.isArray(invitedUsernames)) {
      return 'Invited usernames must be an array.';
    }
    if (invitedUsernames.length > MAX_ITEMS) {
      return `Too many invited usernames. Maximum allowed is ${MAX_ITEMS}.`;
    }
    for (let i = 0; i < invitedUsernames.length; i++) {
      const u = invitedUsernames[i];
      if (typeof u !== 'string' || u.trim().length === 0) {
        return `Invited username at index ${i} must be a non-empty string.`;
      }
    }
  }

  // 6. Validate Invited Emails (Optional Array)
  if (invitedEmails !== undefined && invitedEmails !== null) {
    if (!Array.isArray(invitedEmails)) {
      return 'Invited emails must be an array.';
    }
    if (invitedEmails.length > MAX_ITEMS) {
      return `Too many invited emails. Maximum allowed is ${MAX_ITEMS}.`;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < invitedEmails.length; i++) {
      const email = invitedEmails[i];
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return `Invited email at index ${i} is invalid.`;
      }
    }
  }

  // 7. Validate "At least one member" rule (Logic from server.js)
  const hasManualMembers = Array.isArray(members) && members.length > 0;
  const hasInvitedUsernames = Array.isArray(invitedUsernames) && invitedUsernames.length > 0;
  const hasInvitedEmails = Array.isArray(invitedEmails) && invitedEmails.length > 0;

  if (!hasManualMembers && !hasInvitedUsernames && !hasInvitedEmails) {
    return 'Please add at least one member (manual or invited).';
  }

  return null;
}

/**
 * Validates that the amount is a positive number.
 * @param {any} amount - The amount to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function validateAmount(amount) {
  // Must be a number type, not NaN, finite, and greater than 0
  return typeof amount === 'number' && !isNaN(amount) && isFinite(amount) && amount > 0;
}

/**
 * Validates that the ID is a safe Firebase key (alphanumeric, -, _).
 * Prevents path traversal and injection.
 * @param {string} id - The ID to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidFirebaseId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // Allow alphanumeric, hyphen, underscore.
  // Standard Firebase Push IDs look like -N5...
  // UUIDs are alphanumeric with hyphens.
  // Must be at least 1 char, max 128 (arbitrary safe limit, usually ~20-36)
  if (id.length > 128) return false;

  // Regex: Only allow a-z, A-Z, 0-9, -, _
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

module.exports = { validateCreateGroup, validateAmount, isValidFirebaseId };
